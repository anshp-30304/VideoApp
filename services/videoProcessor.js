const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { updateJobStatus, updateJobProgress } = require('../data/jobs');

// Quality presets
const qualityPresets = {
  low: {
    videoBitrate: '500k',
    audioBitrate: '128k',
    resolution: '640x480',
    crf: 28
  },
  medium: {
    videoBitrate: '1500k',
    audioBitrate: '192k',
    resolution: '1280x720',
    crf: 23
  },
  high: {
    videoBitrate: '3000k',
    audioBitrate: '256k',
    resolution: '1920x1080',
    crf: 18
  }
};

const transcodeVideo = async (job) => {
  try {
    console.log(`Starting transcoding job ${job.id}`);
    
    updateJobStatus(job.id, 'processing');
    
    const inputPath = path.join(__dirname, '..', 'uploads', job.videoId);
    const outputDir = path.join(__dirname, '..', 'outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputFilename = `${job.id}_${job.quality}.${job.format}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    const preset = qualityPresets[job.quality] || qualityPresets.medium;
    
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .videoBitrate(preset.videoBitrate)
        .audioBitrate(preset.audioBitrate)
        .size(preset.resolution)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format(job.format);

      // Add CPU-intensive options to increase processing time
      command = command
        .addOption('-crf', preset.crf.toString())
        .addOption('-preset', 'veryslow') // Most CPU-intensive preset
        .addOption('-tune', 'film')
        .addOption('-profile:v', 'high')
        .addOption('-level', '4.1');

      // Add progress tracking
      command.on('progress', (progress) => {
        const percent = Math.round(progress.percent || 0);
        updateJobProgress(job.id, percent);
        console.log(`Job ${job.id}: ${percent}% complete`);
      });

      command.on('end', () => {
        console.log(`Job ${job.id} completed successfully`);
        updateJobStatus(job.id, 'completed', {
          outputPath: outputPath,
          progress: 100
        });
        resolve();
      });

      command.on('error', (error) => {
        console.error(`Job ${job.id} failed:`, error.message);
        updateJobStatus(job.id, 'failed', {
          error: error.message
        });
        reject(error);
      });

      command.save(outputPath);
    });
    
  } catch (error) {
    console.error(`Job ${job.id} initialization failed:`, error);
    updateJobStatus(job.id, 'failed', {
      error: error.message
    });
    throw error;
  }
};

// CPU-intensive processing function for load testing
const performCpuIntensiveTask = (duration = 30000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let iterations = 0;
    
    const intensiveLoop = () => {
      const loopStart = Date.now();
      
      // Perform CPU-intensive calculations
      while (Date.now() - loopStart < 100) { // 100ms chunks
        for (let i = 0; i < 100000; i++) {
          Math.sqrt(Math.random() * 1000000);
          Math.sin(Math.random() * Math.PI);
          Math.cos(Math.random() * Math.PI);
        }
        iterations++;
      }
      
      if (Date.now() - startTime < duration) {
        setImmediate(intensiveLoop);
      } else {
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
  qualityPresets
};
