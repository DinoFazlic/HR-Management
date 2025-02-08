const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

// Route to render the user's dashboard
router.get('/userDashboard', verifyToken, allowRoles('user'), async (req, res) => {
  try {
      const userId = req.user.id;
      const { company, position, deadline } = req.query;

      
      let query = `
          SELECT * FROM job_postings 
          WHERE status = 'active' 
          AND NOT EXISTS (
              SELECT 1 FROM candidates 
              WHERE candidates.job_posting_id = job_postings.id 
              AND candidates.user_id = $1
          )
      `;
      const values = [userId];
      let index = 2;

      if (company) {
          query += ` AND company_name ILIKE $${index}`;
          values.push(`%${company}%`);
          index++;
      }

      if (position) {
          query += ` AND title ILIKE $${index}`;
          values.push(`%${position}%`);
          index++;
      }

      if (deadline) {
          query += ` AND deadline <= $${index}`;
          values.push(deadline);
      }

      const activeJobsResult = await pool.query(query, values);
      const activeJobs = activeJobsResult.rows;

      // Query to fetch jobs the user has already applied for
      const appliedJobsResult = await pool.query(`
          SELECT jp.title, jp.company_name, c.status, c.applied_at 
          FROM candidates c
          JOIN job_postings jp ON c.job_posting_id = jp.id
          WHERE c.user_id = $1
          ORDER BY c.applied_at DESC
      `, [userId]);

      const appliedJobs = appliedJobsResult.rows;

      // Render the user dashboard template with data
      res.render('user/userDashboard', {
          user: req.user,
          activeJobs,
          appliedJobs,
          userEmail : req.user.email
      });
  } catch (err) {
      console.error('Error loading filtered user dashboard:', err.message);
      res.status(500).send('Server Error');
  }
});


module.exports = router;
