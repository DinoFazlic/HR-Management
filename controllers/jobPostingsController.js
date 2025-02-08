const pool = require('../config/db'); // Ensure database connection

// Create a new job posting
exports.addJobPosting = async (req, res) => {
    const { title, description, required_documents, form_fields, company_name, deadline } = req.body;

    try {
        // Ensure required_documents and form_fields are valid arrays
        const documents = typeof required_documents === 'string' ? JSON.parse(required_documents) : required_documents;
        const fields = typeof form_fields === 'string' ? JSON.parse(form_fields) : form_fields;

        if (!Array.isArray(documents) || !Array.isArray(fields)) {
            return res.status(400).json({ message: 'Invalid data format for required_documents or form_fields' });
        }

        const query = `
            INSERT INTO job_postings (title, description, required_documents, form_fields, company_name, deadline)
            VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6) RETURNING *;
        `;
        const values = [
            title,
            description,
            JSON.stringify(documents),
            JSON.stringify(fields),
            company_name,
            deadline,
        ];
        await pool.query(query, values);

        res.redirect('/job-postings/manage');
    } catch (err) {
        console.error('Error creating job posting:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};




// Fetch all job postings with filtering
exports.getJobPostings = async (req, res) => {
    const { status, search } = req.query;

    try {
        let query = `SELECT * FROM job_postings WHERE 1=1`;
        const values = [];

        if (status) {
            query += ` AND status = $${values.length + 1}`;
            values.push(status);
        }
        if (search) {
            query += ` AND title ILIKE $${values.length + 1}`;
            values.push(`%${search}%`);
        }

        const result = await pool.query(query, values);
        res.status(200).json({ job_postings: result.rows });
    } catch (err) {
        console.error('Error fetching job postings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update a job posting
exports.updateJobPosting = async (req, res) => {
    const { id } = req.params;
    const { title, description, required_documents, form_fields, company_name, deadline, status } = req.body;

    try {
        const query = `
            UPDATE job_postings
            SET title = $1, description = $2, required_documents = $3::jsonb, form_fields = $4::jsonb, 
                company_name = $5, deadline = $6, status = $7, updated_at = CURRENT_TIMESTAMP
            WHERE id = $8 RETURNING *;
        `;
        const values = [
            title,
            description,
            JSON.stringify(required_documents),
            JSON.stringify(form_fields),
            company_name,
            deadline,
            status,
            id,
        ];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Job posting not found' });
        }

        res.status(200).json({ message: 'Job posting updated successfully', job_posting: result.rows[0] });
    } catch (err) {
        console.error('Error updating job posting:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Archive a job posting
exports.archiveJobPosting = async (req, res) => {
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
            return res.status(404).json({ message: 'Job posting not found' });
        }

        res.status(200).json({ message: 'Job posting archived successfully', job_posting: result.rows[0] });
    } catch (err) {
        console.error('Error archiving job posting:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

