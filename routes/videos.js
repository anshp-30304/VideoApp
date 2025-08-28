const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { transcodeVideo } = require('../services/videoProcessor');
const Video = require('../data/videos'); // Mongoose model
const Job = require('../data/jobs');
const router = express.Router();

// Multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4','video/avi','video/mov','video/wmv','video/flv','video/webm','video/mkv'
  ];
  cb(null, allowedTypes.includes(file.mimetype));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });

// Upload video
router.post('/upload', authenticateToken, requirePermission('upload'), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

    const { title, description, quality = 'medium' } = req.body;

    const video = new Video({
      filename: req.file.filename,
      originalName: req.file.originalname,
      description: description || '',
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.userId,
      uploadedAt: new Date(),
      path: req.file.path,
      status: 'uploaded',
      quality
    });

    await video.save();

    res.status(201).json({ message: 'Video uploaded successfully', video });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.post('/:videoId/transcode', authenticateToken, requirePermission('transcode'), async (req, res) => {
  try {
    const { videoId } = req.params;
    const { quality = 'medium', format = 'mp4', parameters = {} } = req.body;

   const video = await Video.findOne({ filename: videoId }); 
    if (!video) return res.status(404).json({ error: 'Video not found' });

    // Create a new Job in Mongo
    const job = await Job.createTranscodeJob({
      videoId: video._id.toString(),
      userId: req.user.userId,
      inputFilename: video.filename,
      quality,
      format,
      parameters
    });

    // Start transcoding asynchronously
    transcodeVideo(job).catch(err => console.error('Transcoding error:', err));

    res.status(202).json({
      message: 'Transcoding job started',
      job: {
        id: job._id,
        videoId: job.videoId,
        status: job.status,
        quality: job.quality,
        format: job.format,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    console.error('Transcode request error:', error);
    res.status(500).json({ error: 'Failed to start transcoding job' });
  }
});

router.get('/my-jobs', authenticateToken, async (req, res) => {
  try {
    const jobs = await Job.getJobsByUser(req.user.userId);
    res.json({ jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to retrieve jobs' });
  }
});

// Get user's videos
router.get('/my-videos', authenticateToken, async (req, res) => {
  try {
    const videos = await Video.find({ uploadedBy: req.user.userId });
    res.json({ videos });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to retrieve videos' });
  }
});

// Download video
router.get('/:videoId/download', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { type = 'original' } = req.query;

   const video = await Video.findOne({ filename: videoId }); 
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const filePath = type === 'original'
        ? path.join(__dirname, '..', 'uploads', video.filename)
        : path.join(__dirname, '..', 'outputs', video.filename);

    res.sendFile(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(404).json({ error: 'Video not found' });
  }
});

// Delete video (admin only)
router.delete('/:videoId', authenticateToken, requirePermission('delete'), async (req, res) => {
  try {
    const { videoId } = req.params;
   const video = await Video.findOne({ filename: videoId }); 
    if (!video) return res.status(404).json({ error: 'Video not found' });

    // Delete files
    await fs.unlink(path.join(__dirname, '..', 'uploads', video.filename)).catch(() => {});
    await fs.unlink(path.join(__dirname, '..', 'outputs', video.filename)).catch(() => {});

    await video.remove();

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

module.exports = router;
