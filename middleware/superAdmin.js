const superAdmin = (req, res, next) => {
    if (!req.user || req.user.email !== 'dhruv9671267714@gmail.com') {
        if (req.xhr || req.path.includes('/api/')) {
            return res.status(403).json({ error: 'Super Admin privileges required.' });
        }
        return res.redirect('/dashboard');
    }
    next();
};

module.exports = superAdmin;
