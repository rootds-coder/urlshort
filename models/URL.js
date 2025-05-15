const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const urlSchema = new mongoose.Schema({
    fullUrl: {
        type: String,
        required: true
    },
    shortUrl: {
        type: String,
        required: true,
        default: () => nanoid(8)
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clicks: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

// Create TTL index for auto-deletion
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster queries
urlSchema.index({ user: 1, createdAt: -1 });

const URL = mongoose.model('URL', urlSchema);

module.exports = URL; 