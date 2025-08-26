const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { createTranscodeJob, getJobsByUser } = require('../data/jobs');
const { transcodeVideo } = require('../services/videoProcessor');
const { log } = require('console');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Upload video endpoint
router.post('/upload', authenticateToken, requirePermission('upload'), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, description, quality = 'medium' } = req.body;

    const videoData = {
      id: req.file.filename,           // <-- this is the saved file name
      filename: req.file.filename,
      originalName: req.file.originalname,
      description: description || '',
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.userId,
      uploadedAt: new Date(),
      path: req.file.path,
      status: 'uploaded',
      quality: quality
    };

    res.status(201).json({
      message: 'Video uploaded successfully',
      video: videoData
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// // Start transcoding job
router.post('/:videoId/transcode', authenticateToken, requirePermission('transcode'), async (req, res) => {
  try {
    const { videoId } = req.params;
    const { quality = 'medium', format = 'mp4' } = req.body;

    const job = createTranscodeJob({
      videoId,
      userId: req.user.userId,
      filename:videoId,
      quality,
     inputFilename: videoId,
      format,
      parameters: req.body.parameters || {}
    });

  
    
    // Start transcoding asynchronously
    transcodeVideo(job).catch(error => {
      console.error('Transcoding error:', error);
    });

    res.status(202).json({
      message: 'Transcoding job started',
      job: {
        id: job.id,
        inputFilename: job.inputFilename,
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

// Get user's videos
router.get('/my-videos', authenticateToken, (req, res) => {
  try {
    const userJobs = getJobsByUser(req.user.userId);

    res.json({
      videos: userJobs.map(job => ({
        id: job.id,
        videoId: job.videoId,
        title: job.title || 'Untitled',
        status: job.status,
        inputFilename: job.inputFilename,
        quality: job.quality,
        format: job.format,
        progress: job.progress,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        outputPath: "./outputs"
      }))
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to retrieve videos' });
  }
});

// Get video file
router.get('/:videoId/download', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { type = 'original' } = req.query;

    // In a real app, you'd check if user owns this video or has permission
    // For now, we'll serve files from the uploads or outputs directory

    let filePath;
    if (type === 'original') {
      filePath = path.join(__dirname, '..', 'uploads', videoId);
    } else {
      filePath = path.join(__dirname, '..', 'outputs', videoId);
    }

    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'Video file not found' });
    }

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

    // Delete original file
    try {
      const originalPath = path.join(__dirname, '..', 'uploads', videoId);
      await fs.unlink(originalPath);
    } catch (error) {
      console.log('Original file not found or already deleted');
    }

    // Delete output files
    try {
      const outputPath = path.join(__dirname, '..', 'outputs', videoId);
      await fs.unlink(outputPath);
    } catch (error) {
      console.log('Output file not found or already deleted');
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

module.exports = router;
