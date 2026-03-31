const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    utr: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    planId: {
        type: String,
        enum: ['trial', 'pro', 'elite'],
        required: true,
        default: 'elite'
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for query performance
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ user: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
