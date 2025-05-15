const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { nanoid } = require('nanoid');
const Url = require('./models/url');
require('dotenv').config();
const auth = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

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
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 15000,
            retryWrites: true,
            retryReads: true,
            maxPoolSize: 10,
            minPoolSize: 5,
            heartbeatFrequencyMS: 2000,
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

// Helper function to calculate expiry date
function calculateExpiry(expiryOption) {
    const now = new Date();
    switch (expiryOption) {
        case '1m':
            return new Date(now.getTime() + 60 * 1000);
        case '1h':
            return new Date(now.getTime() + 60 * 60 * 1000);
        case '6h':
            return new Date(now.getTime() + 6 * 60 * 60 * 1000);
        case '1d':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case '7d':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        default:
            return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 1 day
    }
}

// Routes
app.use('/api/urls', require('./routes/urls'));
app.use('/auth', require('./routes/auth'));

// Main page route
app.get('/', auth, (req, res) => {
    res.redirect('/main');
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.get('/register', (req, res) => {
    res.render('register', { 
        error: null,
        process: { env: { SECRET_CODE: process.env.SECRET_CODE } }
    });
});

app.get('/main', auth, async (req, res) => {
    try {
        const urls = await Url.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.render('index', { 
            baseUrl: req.protocol + '://' + req.get('host'),
            user: req.user,
            urls: urls
        });
    } catch (error) {
        console.error('Error fetching URLs:', error);
        res.status(500).render('index', {
            baseUrl: req.protocol + '://' + req.get('host'),
            user: req.user,
            urls: [],
            error: 'Error loading URLs'
        });
    }
});

app.post('/shorten', auth, async (req, res) => {
    try {
        const { fullUrl, customShortCode, expiry } = req.body;
        
        // Validate URL
        if (!fullUrl || !fullUrl.startsWith('http')) {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        // Check MongoDB connection and attempt to reconnect if needed
        if (mongoose.connection.readyState !== 1) {
            console.log('Database not connected, attempting to reconnect...');
            await connectWithRetry();
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (mongoose.connection.readyState !== 1) {
                throw new Error('Database connection failed after retry');
            }
        }

        // Check if custom short code is already in use
        if (customShortCode) {
            const existingUrl = await Url.findOne({ shortUrl: customShortCode });
            if (existingUrl) {
                return res.status(400).json({ error: 'Custom short code already exists' });
            }
        }

        // Generate short code
        const shortCode = customShortCode || nanoid(6);
        
        // Calculate expiry time
        const expiryTime = calculateExpiry(expiry);

        // Store in database
        const newUrl = await Url.create({
            fullUrl,
            shortUrl: shortCode,
            createdAt: new Date(),
            expiresAt: expiryTime,
            user: req.user._id
        });

        // Return success with expiry time
        res.json({
            fullUrl,
            shortUrl: shortCode,
            baseUrl: `${req.protocol}://${req.get('host')}`,
            expiryTime: expiryTime.toISOString(),
            user: req.user
        });
    } catch (error) {
        console.error('Error shortening URL:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Admin route
app.get('/admin', auth, async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        const urls = await Url.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.render('admin', { user: req.user, urls });
    } catch (error) {
        res.status(500).render('error', { error: 'Error loading admin panel' });
    }
});

// Delete all URLs route
app.delete('/urls/delete-all', auth, async (req, res) => {
    try {
        const result = await Url.deleteMany({ user: req.user._id });
        res.json({ message: 'All URLs deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete URLs' });
    }
});

// Delete URL route
app.delete('/urls/:urlId', auth, async (req, res) => {
    try {
        const url = await Url.findOneAndDelete({
            _id: req.params.urlId,
            user: req.user._id
        });

        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        res.json({ message: 'URL deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete URL' });
    }
});

// Redirect route
app.get('/:shortUrl', async (req, res) => {
    try {
        const url = await Url.findOne({ shortUrl: req.params.shortUrl });
        
        if (!url) {
            return res.status(404).render('error', { error: 'URL not found' });
        }

        if (new Date(url.expiresAt) < new Date()) {
            return res.status(410).render('error', { error: 'URL has expired' });
        }

        url.clicks += 1;
        await url.save();
        
        res.redirect(url.fullUrl);
    } catch (error) {
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