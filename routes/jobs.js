const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { getAllJobs, getJobById, getJobsByUser, updateJobStatus } = require('../data/jobs');

const router = express.Router();

// Get all jobs (admin only)
router.get('/', authenticateToken, requirePermission('view_all'), (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let jobs = getAllJobs();
    
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }
    
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedJobs = jobs.slice(startIndex, endIndex);
    
    res.json({
      jobs: paginatedJobs,
      total: jobs.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to retrieve jobs' });
  }
});

// Get specific job
router.get('/:jobId', authenticateToken, (req, res) => {
  try {
    const { jobId } = req.params;
    const job = getJobById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Check if user owns this job or is admin
    if (job.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to retrieve job' });
  }
});

// Get user's jobs
router.get('/user/:userId', authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only see their own jobs unless they're admin
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const jobs = getJobsByUser(userId);
    res.json({ jobs });
  } catch (error) {
    console.error('Get user jobs error:', error);
    res.status(500).json({ error: 'Failed to retrieve user jobs' });
  }
});

// Cancel job
router.post('/:jobId/cancel', authenticateToken, (req, res) => {
  try {
    const { jobId } = req.params;
    const job = getJobById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Check if user owns this job or is admin
    if (job.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(400).json({ error: 'Cannot cancel completed or failed job' });
    }
    
    updateJobStatus(jobId, 'cancelled');
    
    res.json({ message: 'Job cancelled successfully' });
  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

module.exports = router;
