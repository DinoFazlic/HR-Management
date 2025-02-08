const express = require('express');
const multer = require('multer');
const pool = require('../config/db'); 
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname); 
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true); 
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});


// Route to render the profile editing page
router.get('/edit', verifyToken, allowRoles('user'), async (req, res) => {
    try {
        const userId = req.user.id;

        
        const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
        const profile = result.rows[0] || {}; 

        res.render('user/editProfile', { profile }); 
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).send('Server error');
    }
});


// Route to handle profile updates or creation
router.post('/', verifyToken, allowRoles('user'), upload.single('cv'), async (req, res) => {
    try {
        const userId = req.user.id;
        // Destructure form data and uploaded file details from the request
        const { name, email, phone, experience, education, skills } = req.body;
        const cvPath = req.file ? req.file.filename : null;

        const query = `
            INSERT INTO user_profiles (user_id, name, email, phone, experience, education, skills, cv, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET 
                name = $2,
                email = $3,
                phone = $4,
                experience = $5,
                education = $6,
                skills = $7,
                cv = COALESCE($8, user_profiles.cv),
                updated_at = CURRENT_TIMESTAMP;
        `;
        const values = [userId, name, email, phone, experience, education, skills, cvPath];

        await pool.query(query, values);

        res.render('user/userDashboard', { user: req.user }); 
    } catch (err) {
        console.error('Error saving profile:', err.message);
        res.status(500).send('Server error');
    }
});


// Route to fetch the user's profile data in JSON format
router.get('/get', verifyToken, allowRoles('user'), async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT name, email, phone, education, cv
            FROM user_profiles
            WHERE user_id = $1
        `;
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.json({
                name: '',
                email: '',
                phone: '',
                education: '',
                cv: {} 
            });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;
