const express = require('express');
const router = express.Router();
const UrlModel = require('../models/URL');
const Click = require('../models/Click');
const auth = require('../middleware/auth');
const apiAuth = require('../middleware/apiAuth');
const validUrl = require('valid-url');
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

// Helper: parse expiry option into a Date
function calculateExpiry(expiryOption) {
    const now = new Date();
    switch (expiryOption) {
        case '1h':  return new Date(now.getTime() + 60 * 60 * 1000);
        case '6h':  return new Date(now.getTime() + 6 * 60 * 60 * 1000);
        case '1d':  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case '7d':  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case '30d': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        default:    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
}

// ──── Create short URL (UI) ───────────────────────────────────────────────────
router.post('/shorten', auth, async (req, res) => {
    try {
        const { fullUrl, customShortCode, expiry, password, category } = req.body;

        if (!fullUrl) return res.status(400).json({ error: 'URL is required' });
        if (!validUrl.isUri(fullUrl)) return res.status(400).json({ error: 'Invalid URL format' });

        // Enforce Premium limitations
        const activelyPremium = req.user.isPremium || (req.user.premiumExpiresAt && req.user.premiumExpiresAt > new Date());
        if (!activelyPremium) {
            const linkCount = await UrlModel.countDocuments({ user: req.user._id });
            if (linkCount >= 10) {
                return res.status(403).json({ error: 'PREMIUM_REQUIRED', message: 'You have reached the free tier limit of 10 links.' });
            }
            if (expiry && expiry === '30d') {
                return res.status(403).json({ error: 'PREMIUM_REQUIRED', message: '30-day expiration is a Premium feature.' });
            }
        }

        let shortCode = customShortCode ? customShortCode.trim() : nanoid(6);
        if (customShortCode) {
            const exists = await UrlModel.findOne({ shortUrl: shortCode });
            if (exists) return res.status(400).json({ error: 'Custom short code already exists' });
        }

        const expiresAt = calculateExpiry(expiry);
        let hashedPassword = undefined;
        if (password && password.trim()) {
            hashedPassword = await bcrypt.hash(password.trim(), 10);
        }

        const url = await UrlModel.create({
            fullUrl,
            shortUrl: shortCode,
            user: req.user._id,
            expiresAt,
            password: hashedPassword,
            category: category || 'General'
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            _id: url._id,
            fullUrl: url.fullUrl,
            shortUrl: url.shortUrl,
            shortLink: `${baseUrl}/${url.shortUrl}`,
            category: url.category,
            clicks: url.clicks,
            createdAt: url.createdAt,
            expiresAt: url.expiresAt,
            hasPassword: !!hashedPassword
        });
    } catch (error) {
        console.error('Shorten error:', error);
        res.status(500).json({ error: 'Error creating short URL' });
    }
});

// ──── Create short URL (API Key) ─────────────────────────────────────────────
router.post('/api/shorten', apiAuth, async (req, res) => {
    try {
        const { fullUrl, customShortCode, expiry, category } = req.body;
        if (!fullUrl) return res.status(400).json({ error: 'URL is required' });
        if (!validUrl.isUri(fullUrl)) return res.status(400).json({ error: 'Invalid URL format' });

        let shortCode = customShortCode ? customShortCode.trim() : nanoid(6);
        if (customShortCode) {
            const exists = await UrlModel.findOne({ shortUrl: shortCode });
            if (exists) return res.status(400).json({ error: 'Custom short code already exists' });
        }

        const expiresAt = calculateExpiry(expiry);
        const url = await UrlModel.create({
            fullUrl,
            shortUrl: shortCode,
            user: req.user._id,
            expiresAt,
            category: category || 'General'
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            shortLink: `${baseUrl}/${url.shortUrl}`,
            shortUrl: url.shortUrl,
            fullUrl: url.fullUrl,
            expiresAt: url.expiresAt
        });
    } catch (error) {
        res.status(500).json({ error: 'Error creating short URL' });
    }
});

// ──── Get user URLs ───────────────────────────────────────────────────────────
router.get('/my-urls', auth, async (req, res) => {
    try {
        const urls = await UrlModel.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(urls);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching URLs' });
    }
});

// ──── Generate QR Code ────────────────────────────────────────────────────────
router.get('/qr/:urlId', auth, async (req, res) => {
    try {
        const url = await UrlModel.findOne({ _id: req.params.urlId, user: req.user._id });
        if (!url) return res.status(404).json({ error: 'URL not found' });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const shortLink = `${baseUrl}/${url.shortUrl}`;
        const qrDataUrl = await QRCode.toDataURL(shortLink, {
            width: 300,
            margin: 2,
            color: { dark: '#1e1b4b', light: '#ffffff' }
        });
        res.json({ qr: qrDataUrl, shortLink });
    } catch (error) {
        res.status(500).json({ error: 'Error generating QR code' });
    }
});

// ──── Get analytics for a URL ─────────────────────────────────────────────────
router.get('/analytics/:urlId', auth, async (req, res) => {
    try {
        const url = await UrlModel.findOne({ _id: req.params.urlId, user: req.user._id });
        if (!url) return res.status(404).json({ error: 'URL not found' });

        const clicks = await Click.find({ url: url._id }).sort({ timestamp: -1 }).limit(500);

        // Aggregate stats
        const browsers = {}, os = {}, devices = {}, referrers = {};
        const dailyMap = {};

        clicks.forEach(c => {
            browsers[c.browser] = (browsers[c.browser] || 0) + 1;
            os[c.os] = (os[c.os] || 0) + 1;
            devices[c.deviceType] = (devices[c.deviceType] || 0) + 1;
            const ref = c.referrer === 'Direct' ? 'Direct' : (() => {
                try { return new globalThis.URL(c.referrer).hostname || c.referrer; }
                catch { return c.referrer; }
            })();
            referrers[ref] = (referrers[ref] || 0) + 1;
            const day = c.timestamp.toISOString().split('T')[0];
            dailyMap[day] = (dailyMap[day] || 0) + 1;
        });

        const daily = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));

        res.json({
            total: url.clicks,
            browsers: Object.entries(browsers).map(([k, v]) => ({ name: k, count: v })),
            os: Object.entries(os).map(([k, v]) => ({ name: k, count: v })),
            devices: Object.entries(devices).map(([k, v]) => ({ name: k, count: v })),
            referrers: Object.entries(referrers).map(([k, v]) => ({ name: k, count: v })),
            daily,
            recentClicks: clicks.slice(0, 20)
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Error fetching analytics' });
    }
});

// ──── Delete single URL ───────────────────────────────────────────────────────
router.delete('/:urlId', auth, async (req, res) => {
    try {
        const url = await UrlModel.findOneAndDelete({ _id: req.params.urlId, user: req.user._id });
        if (!url) return res.status(404).json({ error: 'URL not found or not authorized' });
        await Click.deleteMany({ url: req.params.urlId });
        res.json({ message: 'URL deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting URL' });
    }
});

// ──── Delete all URLs for user ────────────────────────────────────────────────
router.delete('/', auth, async (req, res) => {
    try {
        const urls = await UrlModel.find({ user: req.user._id }, '_id');
        const ids = urls.map(u => u._id);
        await Click.deleteMany({ url: { $in: ids } });
        await UrlModel.deleteMany({ user: req.user._id });
        res.json({ message: 'All URLs deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting URLs' });
    }
});

module.exports = router;