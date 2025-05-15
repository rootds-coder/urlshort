const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Email configuration
const emailConfig = {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
};

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// Validate email domain
const validateEmailDomain = (email) => {
    const allowedDomains = ['gmail.com', 'outlook.com', 'hotmail.com'];
    const domain = email.split('@')[1];
    return allowedDomains.includes(domain);
};

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
    const info = await transporter.sendMail({
        from: `"URL Shortener" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Email Verification OTP',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f4;
                        background-image: linear-gradient(45deg, #f3f3f3 25%, transparent 25%),
                                          linear-gradient(-45deg, #f3f3f3 25%, transparent 25%),
                                          linear-gradient(45deg, transparent 75%, #f3f3f3 75%),
                                          linear-gradient(-45deg, transparent 75%, #f3f3f3 75%);
                        background-size: 20px 20px;
                        background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        padding: 20px;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        position: relative;
                        overflow: hidden;
                    }
                    .container::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: linear-gradient(90deg, #4a90e2, #67b26f);
                    }
                    .header {
                        text-align: center;
                        padding: 20px 0;
                        background: linear-gradient(135deg, #4a90e2, #67b26f);
                        border-radius: 8px 8px 0 0;
                        margin: -20px -20px 20px -20px;
                        position: relative;
                        overflow: hidden;
                    }
                    .header::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
                                    linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%);
                        background-size: 20px 20px;
                    }
                    .header h1 {
                        color: #ffffff;
                        margin: 0;
                        font-size: 24px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                        position: relative;
                    }
                    .content {
                        padding: 20px;
                        color: #333333;
                        background: linear-gradient(to bottom, #ffffff, #fafafa);
                        border-radius: 4px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #4a90e2, #67b26f);
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 4px;
                        margin: 20px 0;
                        font-weight: bold;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                    }
                    .button:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #666666;
                        font-size: 12px;
                        border-top: 1px solid #eeeeee;
                        margin-top: 20px;
                        background: linear-gradient(to bottom, #fafafa, #f4f4f4);
                        border-radius: 0 0 8px 8px;
                    }
                    .warning {
                        background: linear-gradient(to right, #fff3cd, #ffeeba);
                        border: 1px solid #ffeeba;
                        color: #856404;
                        padding: 12px;
                        border-radius: 4px;
                        margin: 20px 0;
                        position: relative;
                        overflow: hidden;
                    }
                    .warning::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%);
                        background-size: 10px 10px;
                    }
                    @media only screen and (max-width: 600px) {
                        .container {
                            margin: 10px;
                            padding: 10px;
                        }
                        .header {
                            margin: -10px -10px 20px -10px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Email Verification</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Thank you for registering. Please use the following OTP to verify your email address:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4a90e2;">
                                ${otp}
                            </div>
                        </div>
                        
                        <div class="warning">
                            <strong>Note:</strong> This OTP will expire in 5 minutes.
                        </div>
                        
                        <p>If you did not request this verification, please ignore this email.</p>
                        
                        <p>Best regards,<br>URL Shortener Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                        <p>&copy; ${new Date().getFullYear()} URL Shortener. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    });
    return info;
};

// Send OTP route
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email domain
        if (!validateEmailDomain(email)) {
            return res.status(400).json({
                error: 'Only Gmail, Outlook, and Hotmail email addresses are allowed'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                error: 'Email already registered'
            });
        }

        // Generate and save OTP
        const otp = generateOTP();
        await OTP.findOneAndUpdate(
            { email },
            { otp },
            { upsert: true, new: true }
        );

        // Send OTP email
        await sendOTPEmail(email, otp);

        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ error: 'Error sending OTP' });
    }
});

// Verify OTP route
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // OTP is valid
        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ error: 'Error verifying OTP' });
    }
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, otp } = req.body;
        
        console.log('Registration attempt:', { username, email });

        // Validate input
        if (!username || !email || !password || !otp) {
            console.log('Missing required fields');
            return res.status(400).render('register', {
                error: 'All fields are required'
            });
        }

        // Validate email domain
        if (!validateEmailDomain(email)) {
            return res.status(400).render('register', {
                error: 'Only Gmail, Outlook, and Hotmail email addresses are allowed'
            });
        }

        // Verify OTP
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).render('register', {
                error: 'Invalid OTP'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            console.log('User already exists:', existingUser.email);
            return res.status(400).render('register', {
                error: 'Username or email already exists'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        console.log('Attempting to save user...');
        await user.save();
        console.log('User saved successfully');

        // Delete used OTP
        await OTP.deleteOne({ email });

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Get the base URL from the request
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.redirect(`${baseUrl}/main`);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).render('register', {
            error: error.message || 'Error creating account'
        });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).render('login', {
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).render('login', {
                error: 'Invalid credentials'
            });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Get the base URL from the request
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.redirect(`${baseUrl}/main`);
    } catch (error) {
        res.status(400).render('login', {
            error: 'Error logging in'
        });
    }
});

// Logout route
router.get('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.redirect('/login');
});

// Get current user
router.get('/me', auth, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            isAdmin: req.user.isAdmin
        }
    });
});

// Forgot password form
router.get('/forgot', (req, res) => {
    res.render('forgot', { error: null, message: null });
});

// Handle forgot password
router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgot', { error: 'No account with that email found.', message: null });
        }
        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 120000; // 2 minutes
        await user.save();

        // Send email
        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset/${token}`;
        
        // Send the email
        const info = await transporter.sendMail({
            from: `"URL Shortener" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            text: `You are receiving this because you (or someone else) has requested the reset of the password for your account.\n\n
            Please click on the following link, or paste this into your browser to complete the process:\n\n
            ${resetUrl}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            background-color: #f4f4f4;
                            background-image: linear-gradient(45deg, #f3f3f3 25%, transparent 25%),
                                              linear-gradient(-45deg, #f3f3f3 25%, transparent 25%),
                                              linear-gradient(45deg, transparent 75%, #f3f3f3 75%),
                                              linear-gradient(-45deg, transparent 75%, #f3f3f3 75%);
                            background-size: 20px 20px;
                            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            padding: 20px;
                            background-color: #ffffff;
                            border-radius: 8px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                            position: relative;
                            overflow: hidden;
                        }
                        .container::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            height: 4px;
                            background: linear-gradient(90deg, #4a90e2, #67b26f);
                        }
                        .header {
                            text-align: center;
                            padding: 20px 0;
                            background: linear-gradient(135deg, #4a90e2, #67b26f);
                            border-radius: 8px 8px 0 0;
                            margin: -20px -20px 20px -20px;
                            position: relative;
                            overflow: hidden;
                        }
                        .header::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
                                        linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%);
                            background-size: 20px 20px;
                        }
                        .header h1 {
                            color: #ffffff;
                            margin: 0;
                            font-size: 24px;
                            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                            position: relative;
                        }
                        .content {
                            padding: 20px;
                            color: #333333;
                            background: linear-gradient(to bottom, #ffffff, #fafafa);
                            border-radius: 4px;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 24px;
                            background: linear-gradient(135deg, #4a90e2, #67b26f);
                            color: #ffffff;
                            text-decoration: none;
                            border-radius: 4px;
                            margin: 20px 0;
                            font-weight: bold;
                            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            transition: all 0.3s ease;
                        }
                        .button:hover {
                            transform: translateY(-1px);
                            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                        }
                        .footer {
                            text-align: center;
                            padding: 20px;
                            color: #666666;
                            font-size: 12px;
                            border-top: 1px solid #eeeeee;
                            margin-top: 20px;
                            background: linear-gradient(to bottom, #fafafa, #f4f4f4);
                            border-radius: 0 0 8px 8px;
                        }
                        .warning {
                            background: linear-gradient(to right, #fff3cd, #ffeeba);
                            border: 1px solid #ffeeba;
                            color: #856404;
                            padding: 12px;
                            border-radius: 4px;
                            margin: 20px 0;
                            position: relative;
                            overflow: hidden;
                        }
                        .warning::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%);
                            background-size: 10px 10px;
                        }
                        @media only screen and (max-width: 600px) {
                            .container {
                                margin: 10px;
                                padding: 10px;
                            }
                            .header {
                                margin: -10px -10px 20px -10px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>We received a request to reset the password for your account. If you made this request, please click the button below to reset your password:</p>
                            
                            <div style="text-align: center;">
                                <a href="${resetUrl}" class="button">Reset Password</a>
                            </div>
                            
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all;">${resetUrl}</p>
                            
                            <div class="warning">
                                <strong>Note:</strong> This link will expire in 2 minutes for security reasons. Please reset your password immediately.
                            </div>
                            
                            <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                            
                            <p>Best regards,<br>URL Shortener Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message, please do not reply to this email.</p>
                            <p>&copy; ${new Date().getFullYear()} URL Shortener. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        res.render('forgot', { error: null, message: 'A password reset link has been sent to your email.' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.render('forgot', { error: 'Error sending reset email.', message: null });
    }
});

// Reset password form
router.get('/reset/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.render('reset', { error: 'Password reset token is invalid or has expired.', token: null });
        }
        res.render('reset', { error: null, token: req.params.token });
    } catch (error) {
        res.render('reset', { error: 'Error loading reset form.', token: null });
    }
});

// Handle reset password
router.post('/reset/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.render('reset', { error: 'Password reset token is invalid or has expired.', token: null });
        }
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.redirect('/login');
    } catch (error) {
        res.render('reset', { error: 'Error resetting password.', token: req.params.token });
    }
});

module.exports = router; 
