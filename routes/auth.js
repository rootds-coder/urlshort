const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const URL = require('../models/URL');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>LinkSnap verification</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        margin: 0;
                        padding: 0;
                        background-color: #f8fafc;
                        -webkit-font-smoothing: antialiased;
                    }
                    .wrapper {
                        width: 100%;
                        background-color: #f8fafc;
                        padding: 40px 0;
                    }
                    .container {
                        max-width: 500px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        padding: 32px 32px 24px;
                        text-align: center;
                    }
                    .logo {
                        font-size: 28px;
                        font-weight: 800;
                        letter-spacing: -1px;
                        color: #0f172a;
                        margin: 0;
                        display: inline-flex;
                        align-items: center;
                    }
                    .logo-icon {
                        color: #7c3aed;
                        margin-right: 8px;
                    }
                    .content {
                        padding: 0 32px 32px;
                        color: #334155;
                        text-align: center;
                    }
                    h1 {
                        font-size: 20px;
                        font-weight: 700;
                        color: #0f172a;
                        margin: 0 0 12px 0;
                    }
                    p {
                        margin: 0 0 24px 0;
                        font-size: 15px;
                        color: #475569;
                    }
                    .otp-box {
                        background: #f1f5f9;
                        border: 2px dashed #cbd5e1;
                        border-radius: 12px;
                        padding: 24px;
                        margin: 0 auto 24px auto;
                    }
                    .otp-code {
                        font-size: 36px;
                        font-weight: 800;
                        letter-spacing: 8px;
                        color: #7c3aed;
                        margin: 0;
                        font-family: monospace;
                    }
                    .warning {
                        font-size: 13px;
                        color: #64748b;
                        margin: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .footer {
                        text-align: center;
                        padding: 24px 32px;
                        background-color: #f8fafc;
                        color: #94a3b8;
                        font-size: 13px;
                        border-top: 1px solid #f1f5f9;
                    }
                    .footer p {
                        margin: 0 0 8px 0;
                        color: #94a3b8;
                    }
                    .footer p:last-child {
                        margin: 0;
                    }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="container">
                        <div class="header">
                            <h2 class="logo"><span class="logo-icon">🔗</span> LinkSnap</h2>
                        </div>
                        
                        <div class="content">
                            <h1>Verify your email address</h1>
                            <p>You recently registered for a LinkSnap account. Please enter the following 6-digit verification code to complete your setup.</p>
                            
                            <div class="otp-box">
                                <p style="margin:0 0 8px 0; font-size:12px; text-transform:uppercase; letter-spacing:1px; font-weight:700; color:#64748b;">Verification Code</p>
                                <div class="otp-code">${otp}</div>
                            </div>
                            
                            <p class="warning">
                                ⏱️ This code will expire safely in 5 minutes.
                            </p>
                            
                            <p style="font-size:13px; margin-bottom:0;">
                                Didn't request this? You can safely ignore this email.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>Sent securely by LinkSnap Authentication</p>
                            <p>&copy; ${new Date().getFullYear()} LinkSnap. All rights reserved.</p>
                        </div>
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

router.get('/debug-pass', async (req, res) => {
    try {
        const user = await User.findOne({ email: 'hpc1842@gmail.com' });
        if (!user) return res.json({ error: 'User not found' });
        
        const isMatchCurrent = await user.comparePassword('111111');
        res.json({
            email: user.email,
            passHash: user.password ? user.password.substring(0, 10) + '...' : null,
            matches111111: isMatchCurrent
        });
    } catch(e) {
        res.json({ error: e.message });
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

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login Error:', error);
        res.status(400).render('login', {
            error: 'Error logging in'
        });
    }
});

// Google Login/Register route
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'No credential provided' });
        }
        
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { sub, email, name, picture } = payload;
        
        // Find existing user by googleId or email
        let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });
        
        if (user) {
            // Update googleId if not present
            if (!user.googleId) {
                user.googleId = sub;
                await user.save();
            }
        } else {
            // Create a new user
            let username = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
            
            user = new User({
                username,
                email,
                googleId: sub
            });
            await user.save();
        }
        
        // Generate JWT token
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

        res.json({ success: true, redirectUrl: '/dashboard' });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(400).json({ error: 'Google authentication failed' });
    }
});

// Set Password (for accounts created via Google Auth)
router.post('/set-password', auth, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        user.password = password;
        await user.save(); // pre-save hook will hash it for us
        
        res.json({ message: 'Password set successfully!' });
    } catch (error) {
        console.error('Set Password Error:', error);
        res.status(500).json({ error: 'Failed to set password' });
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
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await User.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }
        });
        res.redirect('/login');
    } catch (error) {
        res.render('reset', { error: 'Error resetting password.', token: req.params.token });
    }
});

// Delete account route
router.delete('/delete-account', auth, async (req, res) => {
    try {
        await URL.deleteMany({ user: req.user._id });
        await User.findByIdAndDelete(req.user._id);
        res.clearCookie('token');
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// Change Password Route
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Find user 
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // If user is Google Auth user, they might not have a password
        if (!user.password && user.googleId) {
            return res.status(400).json({ error: 'Google accounts cannot change password directly' });
        }
        
        // Compare current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid current password' });
        }
        
        // Hash and save manually to bypass any pre-save webhook quirks
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const newPasswordHashed = await bcrypt.hash(newPassword, salt);
        await User.findByIdAndUpdate(req.user._id, { password: newPasswordHashed });
        
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// Generate or regenerate API key
router.post('/generate-api-key', auth, async (req, res) => {
    try {
        const { nanoid } = require('nanoid');
        const apiKey = 'sk_' + nanoid(32);
        await User.findByIdAndUpdate(req.user._id, { apiKey });
        res.json({ apiKey });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate API key' });
    }
});

// Get API key
router.get('/api-key', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+apiKey');
        res.json({ apiKey: user.apiKey || null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch API key' });
    }
});

module.exports = router; 
