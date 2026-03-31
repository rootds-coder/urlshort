const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');

// ── Submit Payment UTR ──────────────────────────────────────────────────────
router.post('/submit', auth, async (req, res) => {
    try {
        const { utr, planId, amount } = req.body;
        
        if (!utr || typeof utr !== 'string' || utr.trim().length < 8) {
            return res.status(400).json({ error: 'Please provide a valid UTR number.' });
        }
        
        const validPlans = ['trial', 'pro', 'elite'];
        if (!planId || !validPlans.includes(planId)) {
            return res.status(400).json({ error: 'Please select a valid subscription plan.' });
        }
        
        if (!amount || isNaN(amount) || amount < 9) {
            return res.status(400).json({ error: 'Invalid payment amount specified.' });
        }

        const validUtr = utr.trim();

        // Check if UTR already exists
        const existingPayment = await Payment.findOne({ utr: validUtr });
        if (existingPayment) {
            return res.status(400).json({ error: 'This UTR has already been submitted.' });
        }

        // Check if user already has a pending payment to prevent spamming
        const pendingPayment = await Payment.findOne({ user: req.user._id, status: 'pending' });
        if (pendingPayment) {
            return res.status(400).json({ error: 'You already have a pending payment request. Please wait for approval.' });
        }

        const payment = new Payment({
            user: req.user._id,
            utr: validUtr,
            planId,
            amount
        });

        await payment.save();

        res.status(201).json({ message: 'Payment submitted successfully. We will review it shortly.' });
    } catch (error) {
        console.error('Error submitting payment:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'This UTR has already been submitted.' });
        }
        res.status(500).json({ error: 'Failed to submit payment.' });
    }
});

module.exports = router;
