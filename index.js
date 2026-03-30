// Force reliable DNS servers — fixes ECONNREFUSED on MongoDB SRV lookups
require('dns').setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { nanoid: _nanoid } = require('nanoid');
const URL = require('./models/URL');
const Click = require('./models/Click');
const UAParser = require('ua-parser-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const auth = require('./middleware/auth');
const User = require('./models/User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

// Global template variables to prevent EJS rendering crashes
app.use((req, res, next) => {
    res.locals.googleClientId = process.env.GOOGLE_CLIENT_ID;
    res.locals.process = { env: { SECRET_CODE: process.env.SECRET_CODE } };
    next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB connection with retry logic
let isConnecting = false;

const connectWithRetry = async () => {
    if (isConnecting) {
        console.log('Connection attempt already in progress');
        return;
    }

    try {
        isConnecting = true;
        if (!process.env.MONGODB_URI) {
            throw new Error('Database configuration missing');
        }

        // Close existing connection if any
        if (mongoose.connection.readyState === 1) {
            console.log('Closing existing connection');
            await mongoose.connection.close();
        }

        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 15000,
            maxPoolSize: 10,
            family: 4
        });
        console.log('Database connection established successfully');
        isConnecting = false;
    } catch (err) {
        isConnecting = false;
        console.error('Database connection error:', err);
        setTimeout(connectWithRetry, 5000);
    }
};

// Initial connection
connectWithRetry();

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    if (!isConnecting) {
        setTimeout(connectWithRetry, 5000);
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected, attempting to reconnect...');
    if (!isConnecting) {
        setTimeout(connectWithRetry, 5000);
    }
});

// Handle process termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during MongoDB connection closure:', err);
        process.exit(1);
    }
});


// Routes
app.use('/urls', require('./routes/urls'));
app.use('/api/urls', require('./routes/urls'));
app.use('/auth', require('./routes/auth'));
app.use('/superadmin', require('./routes/superadmin'));

// Home → landing page (unauthenticated) or redirect to dashboard
app.get('/', (req, res) => {
    const token = req.cookies.token;
    if (token) return res.redirect('/dashboard');
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login', { 
        error: null,
        googleClientId: process.env.GOOGLE_CLIENT_ID
    });
});

app.get('/register', (req, res) => {
    res.render('register', { 
        error: null,
        process: { env: { SECRET_CODE: process.env.SECRET_CODE } },
        googleClientId: process.env.GOOGLE_CLIENT_ID
    });
});

// Dashboard (main authenticated page)
app.get('/dashboard', auth, async (req, res) => {
    try {
        const urls = await URL.find({ user: req.user._id }).sort({ createdAt: -1 });
        const categories = [...new Set(urls.map(u => u.category).filter(Boolean))];
        res.render('dashboard', { 
            baseUrl: req.protocol + '://' + req.get('host'),
            user: req.user,
            urls,
            categories,
            upiId: process.env.UPI_ID,
            needsPassword: !req.user.password
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { error: 'Error loading dashboard' });
    }
});

// Keep /main as alias
app.get('/main', auth, (req, res) => res.redirect('/dashboard'));

app.get('/admin', auth, async (req, res) => {
    try {
        const urls = await URL.find({ user: req.user._id }).sort({ createdAt: -1 });
        const totalClicks = urls.reduce((acc, u) => acc + u.clicks, 0);
        res.render('admin', { user: req.user, urls, totalClicks });
    } catch (error) {
        res.status(500).render('error', { error: 'Error loading admin panel' });
    }
});

// Secret pattern to claim Super Admin access
app.get('/superadmin/promote', auth, async (req, res) => {
    try {
        if (req.user.email !== 'dhruv9671267714@gmail.com') {
            return res.status(403).json({ error: 'Only Dhruv can be a Super Admin.' });
        }
        await User.findByIdAndUpdate(req.user._id, { isAdmin: true });
        // Revoke admin rights from everyone else
        await User.updateMany({ email: { $ne: 'dhruv9671267714@gmail.com' } }, { isAdmin: false });
        res.redirect('/superadmin/dashboard');
    } catch (error) {
        res.status(500).json({ error: 'Failed to promote.' });
    }
});



// Redirect route
app.get('/:shortUrl', async (req, res) => {
    try {
        const url = await URL.findOne({ shortUrl: req.params.shortUrl }).select('+password');
        
        if (!url) {
            return res.status(404).render('error', { error: 'URL not found' });
        }

        if (new Date(url.expiresAt) < new Date()) {
            return res.status(410).render('error', { error: 'URL has expired' });
        }

        if (url.password) {
            const providedPassword = req.query.pwd || req.body?.pwd;
            if (!providedPassword) {
                return res.render('password', { shortUrl: req.params.shortUrl, error: null });
            }
            const cleanPassword = String(providedPassword).trim();
            const isMatch = await bcrypt.compare(cleanPassword, url.password);
            if (!isMatch) {
                return res.render('password', { shortUrl: req.params.shortUrl, error: 'Incorrect password' });
            }
        }

        const parser = new UAParser(req.headers['user-agent']);
        const result = parser.getResult();
        
        await Click.create({
            url: url._id,
            referrer: req.headers.referer || req.headers.referrer || 'Direct',
            deviceType: result.device.type || 'Desktop',
            browser: result.browser.name || 'Unknown',
            os: result.os.name || 'Unknown',
            ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown'
        });

        url.clicks += 1;
        await url.save();
        
        res.redirect(url.fullUrl);
    } catch (error) {
        console.error('Redirect Error:', error);
        res.status(500).render('error', { error: 'Internal server error' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { error: 'Page not found' });
});

// Error handler
app.use((err, req, res, next) => {
    res.status(500).render('error', { error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export the Express app for serverless environment
module.exports = app; 