const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const User = require('../models/userModel');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();

// Middleware to validate request inputs
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Admin-only route
router.get('/admin', verifyToken, allowRoles('admin'), (req, res) => {
    res.json({ message: 'Welcome to the admin dashboard!' });
});

// General dashboard route (accessible to all roles)(not used)
router.get('/dashboard', verifyToken, (req, res) => {
    res.render('dashboard', { user: req.user });
});

// Fetch all users (Admin only)
router.get('/users', verifyToken, allowRoles('admin'), async (req, res) => {
    try {
        const users = await User.getAllUsers();
        res.status(200).json({ message: 'All users', users });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// User-only route: Get own profile ussed while testing
router.get('/me', verifyToken, (req, res) => {
    res.status(200).json({
        message: 'Your profile',
        user: req.user,
    });
});

// Admin-only route: Delete a user by ID
router.delete('/users/:id', verifyToken, allowRoles('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        const deletedUser = await User.deleteUserById(userId);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Admin-only route: Update a user's role
router.put('/users/:id/role',verifyToken,allowRoles('admin'),
    [
        param('id').isInt().withMessage('User ID must be an integer'),
        body('role')
            .isIn(['user', 'admin'])
            .withMessage('Role must be either "user" or "admin"'),
    ],
    validate,
    async (req, res) => {
        try {
            const userId = req.params.id;
            const { role } = req.body;

            if (!role) {
                return res.status(400).json({ message: 'Role is required' });
            }

            const updatedUser = await User.updateUserRole(userId, role);
            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({ message: 'User role updated successfully', user: updatedUser });
        } catch (err) {
            console.error('Error updating user role:', err);
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }
);

module.exports = router;
