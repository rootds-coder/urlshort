const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const User = require('../models/User');
const UrlModel = require('../models/URL');
const Click = require('../models/Click');
const Payment = require('../models/Payment');
// ── Dashboard View ──────────────────────────────────────────────────────────
router.get('/dashboard', auth, superAdmin, async (req, res) => {
    res.render('superadmin', {
        user: req.user,
        baseUrl: req.protocol + '://' + req.get('host')
    });
});

// ── Delete User ─────────────────────────────────────────────────────────────
router.delete('/api/users/:id', auth, superAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        if (userId === req.user._id.toString()) {
            return res.status(400).json({ error: 'You cannot delete yourself.' });
        }

        // Find all URLs for this user
        const userUrls = await UrlModel.find({ user: userId });
        const urlIds = userUrls.map(u => u._id);

        // Delete all clicks associated with those URLs
        await Click.deleteMany({ url: { $in: urlIds } });

        // Delete all URLs and then the User
        await UrlModel.deleteMany({ user: userId });
        await User.findByIdAndDelete(userId);

        res.json({ message: 'User and all associated data deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// ── Toggle Premium Status ───────────────────────────────────────────────────
router.patch('/api/users/:id/premium', auth, superAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        if (userId === req.user._id.toString()) {
            return res.status(400).json({ error: 'You cannot alter your own premium status.' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) return res.status(404).json({ error: 'User not found.' });

        targetUser.isPremium = !targetUser.isPremium;
        await targetUser.save();

        res.json({ message: `User premium status set to ${targetUser.isPremium}`, isPremium: targetUser.isPremium });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Failed to correctly toggle premium status.' });
    }
});

// ── Global Analytics API ────────────────────────────────────────────────────
router.get('/api/stats', auth, superAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalLinks = await UrlModel.countDocuments();
        const totalClicks = await Click.countDocuments();

        // Links created today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const linksToday = await UrlModel.countDocuments({ createdAt: { $gte: startOfDay } });

        // Clicks over time (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentClicks = await Click.aggregate([
            {
                $match: {
                    timestamp: { $exists: true, $ne: null, $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            totals: {
                users: totalUsers,
                links: totalLinks,
                clicks: totalClicks,
                linksToday
            },
            dailyClicks: recentClicks.map(c => ({ date: c._id, count: c.count }))
        });
    } catch (error) {
        console.error('Error fetching global stats:', error);
        res.status(500).json({ error: 'Failed to fetch global statistics.' });
    }
});

// ── Users List API ──────────────────────────────────────────────────────────
router.get('/api/users', auth, superAdmin, async (req, res) => {
    try {
        const users = await User.aggregate([
            {
                $lookup: {
                    from: 'urls', // mongoose URL model collection name
                    localField: '_id',
                    foreignField: 'user',
                    as: 'urls'
                }
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    email: 1,
                    isAdmin: 1,
                    isPremium: 1,
                    premiumExpiresAt: 1,
                    createdAt: 1,
                    linkCount: { $size: "$urls" },
                    clickCount: { $sum: "$urls.clicks" }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch user list.' });
    }
});

// ── Payments API ────────────────────────────────────────────────────────────
router.get('/api/payments', auth, superAdmin, async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('user', 'username email')
            .sort({ createdAt: -1 });
        res.json({ payments });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments.' });
    }
});

router.patch('/api/payments/:id/approve', auth, superAdmin, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found.' });
        if (payment.status !== 'pending') return res.status(400).json({ error: 'Payment is already processed.' });

        payment.status = 'approved';
        await payment.save();

        // Calculate new expiration date
        const user = await User.findById(payment.user);
        if (user) {
            let newExpiry = user.premiumExpiresAt && user.premiumExpiresAt > new Date()
                ? new Date(user.premiumExpiresAt)
                : new Date();

            if (payment.planId === 'trial') {
                newExpiry.setDate(newExpiry.getDate() + 2);
            } else if (payment.planId === 'pro') {
                newExpiry.setDate(newExpiry.getDate() + 15);
            } else {
                newExpiry.setDate(newExpiry.getDate() + 30);
            }

            user.isPremium = true;
            user.premiumExpiresAt = newExpiry;
            await user.save();
        }

        res.json({ message: 'Payment approved and user upgraded to premium.' });
    } catch (error) {
        console.error('Error approving payment:', error);
        res.status(500).json({ error: 'Failed to approve payment.' });
    }
});

router.patch('/api/payments/:id/reject', auth, superAdmin, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found.' });
        if (payment.status !== 'pending') return res.status(400).json({ error: 'Payment is already processed.' });

        payment.status = 'rejected';
        await payment.save();

        res.json({ message: 'Payment rejected.' });
    } catch (error) {
        console.error('Error rejecting payment:', error);
        res.status(500).json({ error: 'Failed to reject payment.' });
    }
});

module.exports = router;
