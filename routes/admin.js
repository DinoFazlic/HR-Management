const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

/*
router.get('/adminDashboard', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Access denied');
    }
    res.render('admin/adminDashboard', { user: req.user });
});
*/

//Renders the admin dashboard
router.get('/adminDashboard', verifyToken, allowRoles('admin'), (req, res) => {
    res.render('admin/adminDashboard', { user: req.user });
});




module.exports = router;
