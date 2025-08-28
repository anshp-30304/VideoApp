const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const Job = require('../data/jobs'); // Mongoose model
const router = express.Router();

// Get all jobs (admin only)
router.get('/', authenticateToken, requirePermission('view_all'), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const query = status ? { status } : {};
    const total = await Job.countDocuments(query);
    const jobs = await Job.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit));

    res.json({ jobs, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to retrieve jobs' });
  }
});

// Get specific job
router.get('/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (job.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to retrieve job' });
  }
});

// Get user's jobs
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const jobs = await Job.find({ userId }).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (error) {
    console.error('Get user jobs error:', error);
    res.status(500).json({ error: 'Failed to retrieve user jobs' });
  }
});

// Cancel job
router.post('/:jobId/cancel', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (job.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (['completed', 'failed'].includes(job.status)) {
      return res.status(400).json({ error: 'Cannot cancel completed or failed job' });
    }

    job.status = 'cancelled';
    await job.save();

    res.json({ message: 'Job cancelled successfully', job });
  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

module.exports = router;
