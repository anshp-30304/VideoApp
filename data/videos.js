const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    filename: String,
    originalName: String,
    description: String,
    size: Number,
    mimetype: String,
    uploadedBy: String,
    uploadedAt: Date,
    path: String,
    status: { type: String, enum: ['uploaded', 'processing', 'completed'], default: 'uploaded' },
    quality: String,
    format: String,
    progress: { type: Number, default: 0 },
    completedAt: Date
});

module.exports = mongoose.model('Video', videoSchema);
