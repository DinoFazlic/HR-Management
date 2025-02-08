const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { sendEmail } = require('../utils/email');

const pool = require('../config/db');
const candidatesController = require('../controllers/candidatesController');

// Fetch all candidates
router.get('/list', verifyToken, allowRoles('admin'), async (req, res) => {
    try {
        const query = `
            SELECT 
                candidates.id,
                candidates.name,
                candidates.email,
                candidates.documents->>'resume' AS resume,
                candidates.documents->>'cover_letter' AS cover_letter,
                job_postings.title AS job_title
            FROM candidates
            JOIN job_postings ON candidates.job_posting_id = job_postings.id;
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching candidates:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Fetch candidates by job ID
router.get('/by-job/:jobId', verifyToken, allowRoles('admin'), async (req, res) => {
    const { jobId } = req.params;
    const { education = 'All', status = 'applied' } = req.query;

    try {
        // Fetch job title
        const jobQuery = `SELECT title FROM job_postings WHERE id = $1;`;
        const jobResult = await pool.query(jobQuery, [jobId]);

        if (jobResult.rows.length === 0) {
            return res.status(404).send('Job posting not found');
        }

        const jobTitle = jobResult.rows[0].title;

        // Build candidate query with optional filters for education and status
        let candidateQuery = `
            SELECT 
                c.id, 
                c.name, 
                c.email, 
                c.phone, 
                c.documents::jsonb AS documents,
                c.status,
                c.education_level,
                c.created_at,
                c.ratings AS rating,
                COALESCE(
                    (SELECT json_agg(json_build_object('id', cn.id, 'note', cn.note))
                    FROM candidate_notes cn WHERE cn.candidate_id = c.id), '[]'
                ) AS notes,
                COALESCE(
                    (SELECT json_agg(json_build_object('id', cr.id, 'reviewer_name', cr.reviewer_name, 'review', cr.review))
                    FROM candidate_reviews cr WHERE cr.candidate_id = c.id), '[]'
                ) AS reviews
            FROM candidates c
            WHERE c.job_posting_id = $1
        `;

        const queryParams = [jobId];

        // Add filter for education level if not "All"
        if (education !== 'All') {
            candidateQuery += ` AND c.education_level = $${queryParams.length + 1}`;
            queryParams.push(education);
        }

        // Add filter for status
        candidateQuery += ` AND c.status = $${queryParams.length + 1}`;
        queryParams.push(status);

        // Add sorting logic
        if (education === 'All') {
            // Order by education level (PhD > Master > Bachelor) and created_at
            candidateQuery += `
                ORDER BY 
                CASE 
                    WHEN c.education_level = 'PhD' THEN 1
                    WHEN c.education_level = 'Master' THEN 2
                    WHEN c.education_level = 'Bachelor' THEN 3
                    ELSE 4 
                END, 
                c.created_at DESC
            `;
        } else {
            // Default ordering by created_at for specific education filters
            candidateQuery += ` ORDER BY c.created_at DESC`;
        }

        const candidatesResult = await pool.query(candidateQuery, queryParams);

        // Render the page with the filtered candidates
        res.render('candidates/details', {
            jobId,
            jobTitle,
            candidates: candidatesResult.rows,
        });
    } catch (err) {
        console.error('Error fetching candidates:', err);
        res.status(500).send('Server error');
    }
});

// Add a note to a candidate
router.post('/:id/add-note', verifyToken, allowRoles('admin'), async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;

    try {
        const query = `
            INSERT INTO candidate_notes (candidate_id, note)
            VALUES ($1, $2) RETURNING *;
        `;
        const result = await pool.query(query, [id, note]);

        res.status(200).json({ message: 'Note added successfully!', note: result.rows[0] });
    } catch (err) {
        console.error('Error adding note:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update a candidate's status
router.put('/:id/update-status', verifyToken, allowRoles('admin'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const query = `
            UPDATE candidates
            SET status = $1
            WHERE id = $2
            RETURNING email, name;
        `;
        const result = await pool.query(query, [status, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        const { email, name } = result.rows[0];

        let emailSubject = '';
        let emailText = '';

        switch (status) {
            case 'interview':
                emailSubject = 'Interview Invitation';
                 emailText = `Dear ${name},
                              Congratulations! You have been shortlisted for an interview. Please contact us to arrange a suitable time.
                              Best regards,
                              Your Recruitment Team.
                            `;
            break;

            case 'hired':
                emailSubject = 'Congratulations! You Have Been Hired';
                emailText = `
                    Dear ${name},
            
                    Congratulations! Welcome to our team. We will be in touch soon with further details.
            
                    Best regards,
                    Your Recruitment Team.
                `;
                break;
            
                case 'rejected':
                    emailSubject = 'Application Status Update';
                    emailText = `
                        Dear ${name},
                
                        Thank you for your interest in the position. Unfortunately, you have not been selected to move forward in the process.
                
                        We wish you the best in your future endeavors.
                
                        Best regards,
                        Your Recruitment Team.
                    `;
                    break;
        }

        await sendEmail(email, emailSubject, emailText);

        res.status(200).json({ message: 'Status updated successfully' });

    } catch (err) {
        console.error('Error updating status or sending email:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Add a review for a candidate
router.post('/:id/add-review', async (req, res) => {
    const { id } = req.params;
    const { reviewer_name, review } = req.body; 

    try {
        // Insert the review into the `reviews` table
        await pool.query(
            `INSERT INTO candidate_reviews (candidate_id, reviewer_name, review) VALUES ($1, $2, $3)`,
            [id, reviewer_name, review]
        );

        res.json({ message: 'Review added successfully!' });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ message: 'Error adding review.' });
    }
});


// Schedule an interview for a candidate
router.post('/:id/schedule-interview', async (req, res) => {
    const { id } = req.params; 
    const { scheduled_at } = req.body;

    try {
        
        await pool.query(
            `INSERT INTO interview_schedules (candidate_id, interview_date)
             VALUES ($1, $2)`,
            [id, scheduled_at]
        );

        // Fetch candidates name and email for the email content
        const candidateResult = await pool.query(
            `SELECT name, email FROM candidates WHERE id = $1`,
            [id]
        );
        const candidate = candidateResult.rows[0];

        // Send the email
        const emailContent = `
            Dear ${candidate.name},

            You are invited to an interview.

            Details: The location is our office. Please arrive 10 minutes before the scheduled time.
            Date: ${new Date(scheduled_at).toLocaleDateString()}
            Time: ${new Date(scheduled_at).toLocaleTimeString()}

            Best regards,
            The Team.
        `;
        await sendEmail(candidate.email, 'Interview Invitation', emailContent);

        res.json({ message: 'Interview scheduled successfully!' });
    } catch (err) {
        console.error('Error scheduling interview:', err);
        res.status(500).json({ message: 'Error scheduling interview.' });
    }
});

router.put('/:id/update-rating', verifyToken, allowRoles('admin'), async (req, res) => {
    const candidateId = req.params.id;
    const { rating, job_posting_id } = req.body;

    console.log('Candidate ID:', candidateId);
    console.log('Job Posting ID:', job_posting_id);
    console.log('Rating:', rating);

    try {
        if (!candidateId || !job_posting_id || !rating) {
            return res.status(400).json({ message: 'Invalid data provided.' });
        }

        const query = `
            UPDATE candidates
            SET ratings = $1
            WHERE id = $2 AND job_posting_id = $3
        `;
        await pool.query(query, [rating, candidateId, job_posting_id]);

        res.json({ message: 'Rating updated successfully.' });
    } catch (err) {
        console.error('Error updating rating:', err.message);
        res.status(500).json({ message: 'Internal server error.' });
    }
});




router.post('/', candidatesController.addCandidate); 
router.get('/', candidatesController.getCandidates); 
router.get('/:id', candidatesController.getCandidateById); 
router.put('/:id', candidatesController.updateCandidate); 
router.delete('/:id', candidatesController.deleteCandidate);
router.post('/:id/schedule-interview', candidatesController.scheduleInterview);

module.exports = router;
