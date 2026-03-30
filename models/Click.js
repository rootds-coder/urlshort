const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
    url: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'URL',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    referrer: {
        type: String,
        default: 'Direct'
    },
    deviceType: {
        type: String,
        default: 'Unknown'
    },
    browser: {
        type: String,
        default: 'Unknown'
    },
    os: {
        type: String,
        default: 'Unknown'
    },
    ip: {
        type: String
    }
});

// Index for fast querying per URL
clickSchema.index({ url: 1, timestamp: -1 });

const Click = mongoose.model('Click', clickSchema);

module.exports = Click;
