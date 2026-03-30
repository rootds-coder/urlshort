const User = require('../models/User');

const apiAuth = async (req, res, next) => {
    const apiKey = req.header('x-api-key');

    if (!apiKey) {
        return res.status(401).json({ error: 'No API key provided' });
    }

    try {
        const user = await User.findOne({ apiKey });

        if (!user) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Failed to authenticate API key' });
    }
};

module.exports = apiAuth;
