const express = require('express');
const router = express.Router();
const URL = require('../models/URL');
const auth = require('../middleware/auth');
const validUrl = require('valid-url');
const shortid = require('shortid');

// Shorten URL route
router.post('/shorten', auth, async (req, res) => {
    try {
        const { fullUrl, customShortCode, expiry } = req.body;

        if (!fullUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!validUrl.isUri(fullUrl)) {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        let shortCode = customShortCode;
        if (customShortCode) {
            const existingUrl = await URL.findOne({ shortUrl: customShortCode });
            if (existingUrl) {
                return res.status(400).json({ error: 'Custom short code already exists' });
            }
        } else {
            shortCode = shortid.generate();
        }

        const now = new Date();
        const minutes = parseInt(expiry) || 1440; // Default 24 hours
        const expiresAt = new Date(now.getTime() + minutes * 60000);

        const url = new URL({
            fullUrl,
            shortUrl: shortCode,
            user: req.user._id,
            expiresAt
        });

        await url.save();
        res.json(url);
    } catch (error) {
        res.status(500).json({ error: 'Error shortening URL' });
    }
});

// Delete URL route
router.delete('/:urlId', auth, async (req, res) => {
    try {
        const url = await URL.findOneAndDelete({
            _id: req.params.urlId,
            user: req.user._id
        });

        if (!url) {
            return res.status(404).json({ error: 'URL not found or not authorized' });
        }

        res.json({ message: 'URL deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting URL' });
    }
});

// Get user's URLs
router.get('/my-urls', auth, async (req, res) => {
    try {
        const urls = await URL.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        res.json(urls);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching URLs' });
    }
});

// Redirect route
router.get('/:shortUrl', async (req, res) => {
    try {
        const url = await URL.findOne({ shortUrl: req.params.shortUrl });
        
        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        if (new Date(url.expiresAt) < new Date()) {
            return res.status(410).json({ error: 'URL has expired' });
        }

        url.clicks += 1;
        await url.save();
        
        res.redirect(url.fullUrl);
    } catch (error) {
        res.status(500).json({ error: 'Error redirecting' });
    }
});

module.exports = router; 