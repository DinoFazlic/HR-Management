const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

// Route to render the Statistics Dashboard for admins
router.get('/statDashboard', verifyToken, allowRoles("admin"), (req, res) => {
    res.render('statistics/statDashboard');
});

// Route to fetch statistics data for the dashboard
router.get('/stats', verifyToken, allowRoles("admin"), async (req, res) => {
    try {
        
        const applicationsQuery = `
            SELECT job_postings.title AS job_title, COUNT(candidates.id) AS total_applications
            FROM candidates
            JOIN job_postings ON candidates.job_posting_id = job_postings.id
            GROUP BY job_postings.title
        `;
        const applicationsResult = await pool.query(applicationsQuery);

        const selectionTimeQuery = `
            SELECT job_postings.title AS job_title, 
                   AVG(EXTRACT(DAY FROM (candidates.applied_at - job_postings.created_at))) AS avg_selection_time
            FROM candidates
            JOIN job_postings ON candidates.job_posting_id = job_postings.id
            GROUP BY job_postings.title
        `;
        const selectionTimeResult = await pool.query(selectionTimeQuery);

        const ratingsQuery = `
            SELECT jp.title AS job_title, AVG(c.ratings) AS avg_rating
            FROM job_postings jp
            LEFT JOIN candidates c ON jp.id = c.job_posting_id
            WHERE c.ratings IS NOT NULL
            GROUP BY jp.title;
        `;
        const ratingsResult = await pool.query(ratingsQuery);

        // Send the aggregated data as JSON response
        res.json({
            applications: applicationsResult.rows,
            selectionTime: selectionTimeResult.rows,
            ratings: ratingsResult.rows,
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

module.exports = router;
