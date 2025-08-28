const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const Job = require('../data/jobs'); // Mongo Job model

// Quality presets
const qualityPresets = {
  low: { videoBitrate: '500k', audioBitrate: '128k', resolution: '640x480', crf: 28 },
  medium: { videoBitrate: '1500k', audioBitrate: '192k', resolution: '1280x720', crf: 23 },
  high: { videoBitrate: '3000k', audioBitrate: '256k', resolution: '1920x1080', crf: 18 }
};

// Helper: Update job status in Mongo
const updateJobStatus = async (jobId, status, additionalData = {}) => {
  const job = await Job.findById(jobId);
  if (!job) return null;

  job.status = status;
  if (status === 'processing') job.startedAt = new Date();
  else if (status === 'completed' || status === 'failed') job.completedAt = new Date();

  Object.assign(job, additionalData);
  await job.save();
  return job;
};

// Helper: Update job progress in Mongo
const updateJobProgress = async (jobId, progress) => {
  const job = await Job.findById(jobId);
  if (!job) return null;

  job.progress = Math.min(100, Math.max(0, progress));
  await job.save();
  return job;
};

// Transcode video
const transcodeVideo = async (job) => {
  try {
    console.log(`Starting transcoding job ${job._id}`);

    await updateJobStatus(job._id, 'processing');

    const inputPath = path.join(__dirname, '..', 'uploads', job.inputFilename);
    const outputDir = path.join(__dirname, '..', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });

    const outputFilename = `${job._id}_${job.quality}.${job.format}`;
    const outputPath = path.join(outputDir, outputFilename);

    const preset = qualityPresets[job.quality] || qualityPresets.medium;

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
          .videoBitrate(preset.videoBitrate)
          .audioBitrate(preset.audioBitrate)
          .size(preset.resolution)
          .videoCodec('libx264')
          .audioCodec('aac')
          .format(job.format)
          .addOption('-crf', preset.crf.toString())
          .addOption('-preset', 'veryslow')
          .addOption('-tune', 'film')
          .addOption('-profile:v', 'high')
          .addOption('-level', '4.1');

      command.on('progress', async (progress) => {
        const percent = Math.round(progress.percent || 0);
        await updateJobProgress(job._id, percent);
        console.log(`Job ${job._id}: ${percent}% complete`);
      });

      command.on('end', async () => {
        console.log(`Job ${job._id} completed successfully`);
        await updateJobStatus(job._id, 'completed', { outputPath, progress: 100 });
        resolve();
      });

      command.on('error', async (error) => {
        console.error(`Job ${job._id} failed:`, error.message);
        await updateJobStatus(job._id, 'failed', { error: error.message });
        reject(error);
      });

      command.save(outputPath);
    });
  } catch (error) {
    console.error(`Job ${job._id} initialization failed:`, error);
    await updateJobStatus(job._id, 'failed', { error: error.message });
    throw error;
  }
};

// CPU-intensive load testing (unchanged)
const performCpuIntensiveTask = (duration = 30000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let iterations = 0;

    const intensiveLoop = () => {
      const loopStart = Date.now();
      while (Date.now() - loopStart < 100) {
        for (let i = 0; i < 100000; i++) {
          Math.sqrt(Math.random() * 1000000);
          Math.sin(Math.random() * Math.PI);
          Math.cos(Math.random() * Math.PI);
        }
        iterations++;
      }

      if (Date.now() - startTime < duration) setImmediate(intensiveLoop);
      else {
        console.log(`CPU task completed. Iterations: ${iterations}`);
        resolve(iterations);
      }
    };

    intensiveLoop();
  });
};

module.exports = {
  transcodeVideo,
  performCpuIntensiveTask,
  qualityPresets,
  updateJobStatus,
  updateJobProgress
};
