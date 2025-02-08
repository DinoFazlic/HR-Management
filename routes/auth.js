const express = require('express');
const { register, login } = require('../controllers/authController');
const router = express.Router();

const crypto = require('crypto'); // For generating secure random tokens
const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const bcrypt = require('bcrypt'); // For hashing and comparing passwords
const jwt = require('jsonwebtoken');


router.get('/test', (req, res) => {
    res.send('Auth routes are working!');
});

// Render the registration page
router.get('/register', (req, res) => {
    res.render('auth/register');
});

// Render the login page
router.get('/login', (req, res) => {
    res.render('auth/login');
});

router.get('/logout', (req, res) => {
    res.clearCookie('token'); // Remove token from cookies
    res.redirect('/auth/login');
});

// Render the password reset request page
router.get('/request-reset', (req, res) => {
    res.render('auth/requestReset');
});

// Render the password reset page with the reset token
router.get('/reset-password', (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('Invalid reset link');
    }

    res.render('auth/resetPassword', { token });
});

// Login route: Handles user login
router.post('/login', login);

// Register route: Handles user registration
router.post('/register', register);


// sends a reset link to the users email
router.post('/request-reset', async (req, res) => {
    const { email } = req.body;

    try {
        console.log('Received email for password reset:', email);

        const user = await User.findByEmail(email);
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('User found:', user);

         // Generate a secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        console.log('Generated reset token:', resetToken);

        // Hash the reset token for secure storage
        const hashedToken = await bcrypt.hash(resetToken, 10);
        console.log('Hashed reset token:', hashedToken);

        const resetExpires = new Date(Date.now() + 3600000); 
        console.log('Reset token expires at:', resetExpires);

        // Save the hashed token and expiration to the database
        await User.saveResetToken(user.id, hashedToken, resetExpires);
        console.log('Reset token saved to database for user ID:', user.id);

        const resetLink = `http://localhost:3000/auth/reset-password?token=${resetToken}`;
        console.log('Password reset link:', resetLink);

        const emailHtml = `
            <h1>Password Reset Request</h1>
            <p>Hello ${user.first_name},</p>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>If you did not request this, please ignore this email.</p>
        `;

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, 
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });


        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset Request',
            html: emailHtml, 
        };

        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent to:', user.email);

        res.status(200).json({ message: 'Password reset email sent' });
    } catch (err) {
        console.error('Error during password reset request:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// reset password route
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        console.log('Received reset token:', token);

        // Find user by token (hashed in the database)
        const user = await User.findByResetToken(token);
        if (!user) {
            console.error('No user found for token');
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        console.log('User found for reset token:', user);

        
        const isTokenValid = await bcrypt.compare(token, user.password_reset_token);
        if (!isTokenValid) {
            console.error('Token validation failed');
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        if (new Date() > new Date(user.password_reset_expires)) {
            console.error('Token has expired');
            return res.status(400).json({ message: 'Reset token has expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.updatePassword(user.id, hashedPassword);
        console.log('Password updated successfully for user ID:', user.id);

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('Error during password reset:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// Change password route
router.post('/change-password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.updatePassword(userId, hashedPassword);

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


module.exports = router;
