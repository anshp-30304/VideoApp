const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const jobSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  videoId: { type: String, required: true },
  userId: { type: String, required: true },
  inputFilename: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  quality: { type: String, default: 'medium' },
  format: { type: String, default: 'mp4' },
  parameters: { type: Object, default: {} },
  progress: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,
  outputPath: String,
  error: String
});

// Create Transcode Job
jobSchema.statics.createTranscodeJob = async function(jobData) {
  const job = new this({
    videoId: jobData.videoId,
    userId: jobData.userId,
    inputFilename: jobData.inputFilename,
    quality: jobData.quality || 'medium',
    format: jobData.format || 'mp4',
    parameters: jobData.parameters || {}
  });
  await job.save();
  return job;
};

// Get Job by ID
jobSchema.statics.getJobById = async function(jobId) {
  return this.findById(jobId);
};

// Get All Jobs (sorted by createdAt desc)
jobSchema.statics.getAllJobs = async function() {
  return this.find().sort({ createdAt: -1 });
};

// Get Jobs by User
jobSchema.statics.getJobsByUser = async function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Update Job Status
jobSchema.statics.updateJobStatus = async function(jobId, status, additionalData = {}) {
  const job = await this.findById(jobId);
  if (!job) return null;

  job.status = status;
  if (status === 'processing') job.startedAt = new Date();
  if (status === 'completed' || status === 'failed') job.completedAt = new Date();

  Object.assign(job, additionalData);
  await job.save();
  return job;
};

// Update Job Progress
jobSchema.statics.updateJobProgress = async function(jobId, progress) {
  const job = await this.findById(jobId);
  if (!job) return null;

  job.progress = Math.min(100, Math.max(0, progress));
  await job.save();
  return job;
};

module.exports = mongoose.model('Job', jobSchema);
