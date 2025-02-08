const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// User registration handler
exports.register = async (req, res) => {
    const { first_name, last_name, email, password, role } = req.body;

    try {
        // Validate required fields
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }


        // Checking if a user with the given email already exists
        const existingUser = await User.findByEmail(email);

        if (existingUser) {
            req.flash('error', 'User with this email already exists');
            return res.redirect('/auth/register');
        }

        // Hash the user's password for secure storage
        const hashedPassword = await bcrypt.hash(password, 10);
        // Assign a default role if not provided
        const newRole = role || 'user'; 

        const newUser = await User.create(first_name, last_name, email, hashedPassword, newRole);

        res.redirect('/auth/login');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// User login handler
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findByEmail(email);
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Comparing the provided password with the hashed password stored in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, first_name: user.first_name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set token in HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Ensure HTTPS in production
            maxAge: 3600000, // 1 hour
        });

        if (user.role === 'admin') {
            //console.log('Redirecting to admin dashboard');
            res.redirect('/admin/adminDashboard');
        } else {
            //console.log('Redirecting to user dashboard');
            res.redirect('/users/userDashboard');
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


