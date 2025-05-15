const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
const cors = require('cors');
const auth = require('./middleware/auth');
const URL = require('./models/URL');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Import routes and middleware
const authRoutes = require('./routes/auth');
const urlRoutes = require('./routes/urls');

// Register routes - IMPORTANT: URL routes must be registered before other routes
app.use('/urls', urlRoutes); // Mount URL routes first
app.use('/auth', authRoutes);

// View Routes
app.get('/', (req, res) => {
    try {
        res.render('index');
    } catch (error) {
        res.status(500).render('error', { error: 'Error rendering main page' });
    }
});

app.get('/dashboard', auth, async (req, res) => {
    try {
        res.render('dashboard', { user: req.user });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        res.status(500).render('error', { 
            message: 'Error loading dashboard',
            error: { status: 500 }
        });
    }
});

app.get('/main', auth, async (req, res) => {
    try {
        res.render('dashboard', { user: req.user });
    } catch (error) {
        console.error('Error rendering main page:', error);
        res.status(500).render('error', { 
            message: 'Error loading page',
            error: { status: 500 }
        });
    }
});

app.get('/admin', auth, async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        const urls = await URL.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.render('admin', { user: req.user, urls });
    } catch (error) {
        res.status(500).render('error', { error: 'Error loading admin panel' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    res.status(500).render('error', { error: 'Internal server error' });
});

// 404 handler - must be last
app.use((req, res) => {
    res.status(404).render('error', { error: 'Page not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 