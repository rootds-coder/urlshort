const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const User = require('../models/User');
const UrlModel = require('../models/URL');
const Click = require('../models/Click');

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
            { $match: { timestamp: { $gte: thirtyDaysAgo } } },
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
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        
        // We need link counts and total clicks per user.
        // We'll map them manually or use aggregation.
        // For simplicity, let's aggregate URL count and total clicks per user.

        const urlStats = await UrlModel.aggregate([
            { 
                $group: { 
                    _id: '$user', 
                    linkCount: { $sum: 1 },
                    clickCount: { $sum: '$clicks' }
                } 
            }
        ]);

        const statsMap = {};
        urlStats.forEach(stat => {
            statsMap[stat._id.toString()] = stat;
        });

        const userList = users.map(u => ({
            _id: u._id,
            username: u.username,
            email: u.email,
            isAdmin: u.isAdmin,
            isPremium: u.isPremium,
            createdAt: u.createdAt,
            linkCount: statsMap[u._id.toString()]?.linkCount || 0,
            clickCount: statsMap[u._id.toString()]?.clickCount || 0
        }));

        res.json({ users: userList });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch user list.' });
    }
});

module.exports = router;
