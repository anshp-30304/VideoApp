const { v4: uuidv4 } = require('uuid');

// In-memory job storage (in production, this would be a database)
const jobs = new Map();

const createTranscodeJob = (jobData) => {
  const job = {
    id: uuidv4(),
    videoId: jobData.videoId,
    userId: jobData.userId,
    status: 'pending',
    quality: jobData.quality || 'medium',
    format: jobData.format || 'mp4',
    parameters: jobData.parameters || {},
    progress: 0,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    outputPath: null,
    error: null
  };
  
  jobs.set(job.id, job);
  return job;
};

const getJobById = (jobId) => {
  return jobs.get(jobId);
};

const getAllJobs = () => {
  return Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
};

const getJobsByUser = (userId) => {
  return Array.from(jobs.values())
    .filter(job => job.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
};

const updateJobStatus = (jobId, status, additionalData = {}) => {
  const job = jobs.get(jobId);
  if (job) {
    job.status = status;
    if (status === 'processing') {
      job.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date();
    }
    
    Object.assign(job, additionalData);
    return job;
  }
  return null;
};

const updateJobProgress = (jobId, progress) => {
  const job = jobs.get(jobId);
  if (job) {
    job.progress = Math.min(100, Math.max(0, progress));
    return job;
  }
  return null;
};

module.exports = {
  createTranscodeJob,
  getJobById,
  getAllJobs,
  getJobsByUser,
  updateJobStatus,
  updateJobProgress
};
