const express = require('express');
const router = express.Router();
const jobPostingsController = require('../controllers/jobPostingsController');
const pool = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const multer = require('multer'); // Middleware for file uploads
const upload = multer({ dest: 'uploads/' });




// CRUD Operations for Job Postings
router.get('/', jobPostingsController.getJobPostings); 
router.put('/:id', jobPostingsController.updateJobPosting);
router.delete('/:id', jobPostingsController.archiveJobPosting);
router.post('/', jobPostingsController.addJobPosting);

// CRUD: Create a New Job Posting
router.post('/', verifyToken, allowRoles('admin'), async (req, res) => {
    console.log('Received data:', req.body);

    const { title, description, required_documents = [], form_fields = [], company_name, deadline } = req.body;

    try {
        //console.log('Parsed Required Documents:', required_documents);
        //console.log('Parsed Form Fields:', form_fields);

        const query = `
            INSERT INTO job_postings (title, description, required_documents, form_fields, company_name, deadline)
            VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6) RETURNING *;
        `;
        
        const values = [
            title,
            description,
            JSON.stringify(required_documents),
            JSON.stringify(form_fields),
            company_name,
            deadline,
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ message: 'Job posting created successfully', job: result.rows[0] });
    } catch (err) {
        console.error('Error creating job posting:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});





// Render all job postings
router.get('/manage', verifyToken, allowRoles('admin'), async (req, res) => {
    const { status, search } = req.query;
    let query = `
        SELECT * 
        FROM job_postings
    `;
    const values = [];
    const conditions = [];

    // Filter by status if provided
    if (status === 'active' || status === 'archived') {
        conditions.push('status = $' + (values.length + 1));
        values.push(status);
    }

    // Filter by search term if provided
    if (search) {
        conditions.push('title ILIKE $' + (values.length + 1));
        values.push(`%${search}%`);
    }

    // Append conditions to the query
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add sorting: active jobs first, then archived
    query += ' ORDER BY CASE WHEN status = \'active\' THEN 1 ELSE 2 END, created_at DESC';

    try {
        const result = await pool.query(query, values);
        console.log('Fetched job postings:', result.rows);

        res.render('jobPostings/manage', {
            jobPostings: result.rows,
            status,
            search,
        });
    } catch (err) {
        console.error('Error fetching job postings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});



// Fetch all active job postings
router.get('/active', verifyToken, allowRoles('admin'), async (req, res) => {
    try {
        const query = `SELECT * FROM job_postings WHERE status = 'active' ORDER BY created_at DESC;`;
        const result = await pool.query(query);

        console.log('Active job postings fetched:', result.rows);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching active job postings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// Archive a specific job posting
router.post('/:id/archive', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            UPDATE job_postings
            SET status = 'archived', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 RETURNING *;
        `;
        const values = [id];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).send('Job posting not found');
        }

        res.redirect('/job-postings/manage');
    } catch (err) {
        console.error('Error archiving job posting:', err);
        res.status(500).send('Error archiving job posting');
    }
});

// List all active job postings with optional filters
router.get('/jobs', verifyToken, async (req, res) => {
    try {
        const { company, title, deadline } = req.query;

        let query = `SELECT * FROM job_postings WHERE status = 'active'`;
        const values = [];

        if (company) {
            query += ` AND company ILIKE $${values.length + 1}`;
            values.push(`%${company}%`);
        }
        if (title) {
            query += ` AND title ILIKE $${values.length + 1}`;
            values.push(`%${title}%`);
        }
        if (deadline) {
            query += ` AND deadline <= $${values.length + 1}`;
            values.push(deadline);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, values);
        res.render('jobPostings/listJobs', { jobs: result.rows}); 
    } catch (err) {
        console.error('Error fetching jobs:', err);
        res.status(500).send('Server error');
    }
});


// Fetch details of a specific job posting
router.get('/jobs/:id', async (req, res) => {
    const jobId = req.params.id;

    try {
        const query = `SELECT * FROM job_postings WHERE id = $1`;
        const result = await pool.query(query, [jobId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Job posting not found' });
        }

        res.json(result.rows[0]); // Return the job details as JSON
    } catch (err) {
        console.error('Error fetching job details:', err);
        res.status(500).json({ message: 'Server error' });
    }
});





// Apply to a specific job posting
router.post('/jobs/:id/apply', verifyToken, allowRoles('user'), upload.array('documents', 10), async (req, res) => {
    console.log('Route hit');
    console.log('Request Body:', req.body);

    const userId = req.user.id;
    const jobId = req.params.id;
    const { name, email, phone, education_level, uploaded_files } = req.body;

    try {
        // Ensure documents is an array
        const documents = Array.isArray(uploaded_files) ? uploaded_files : [uploaded_files];

        if (documents.length === 0 || !documents[0]) {
            throw new Error('At least one document is required.');
        }

        // Fetch the user's email from the token if it's not provided
        let userEmail = email;
        if(!userEmail){
            userEmail = req.user.email;
        }

        // Fetch education from user_profiles
        const profileQuery = `SELECT education FROM user_profiles WHERE user_id = $1`;
        const profileResult = await pool.query(profileQuery, [userId]);
        const userEducation = profileResult.rows[0]?.education || 'N/A';

        // Insert into database
        const query = `
            INSERT INTO candidates (user_id, job_posting_id, name, email, phone, education_level, documents, status, applied_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'applied', CURRENT_TIMESTAMP)
        `;
        await pool.query(query, [
            userId,
            jobId,
            name,
            userEmail,
            phone || null,
            userEducation || 'N/A',
            JSON.stringify(documents),
        ]);

        res.json({ message: 'Application submitted successfully' });
    } catch (err) {
        console.error('Error applying to job:', err.message);
        res.status(500).json({ error: err.message });
    }
});




// View user's job applications
router.get('/jobs/applications', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; 

        const query = `
            SELECT c.id AS application_id, j.title, j.company_name, c.status, c.applied_at
            FROM candidates c
            JOIN job_postings j ON c.job_posting_id = j.id
            WHERE c.user_id = $1
            ORDER BY c.applied_at DESC
        `;
        const result = await pool.query(query, [userId]);

        res.render('applications/listApplications', { applications: result.rows }); 
    } catch (err) {
        console.error('Error fetching applications:', err);
        res.status(500).send('Server error');
    }
});



module.exports = router;
