const pool = require('../config/db');
const { sendEmail } = require('../utils/email');

// Add a new candidate
exports.addCandidate = async (req, res) => {
    const { job_posting_id, name, email, phone, documents } = req.body;

    try {
        const query = `
            INSERT INTO candidates (job_posting_id, name, email, phone, documents)
            VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *;
        `;
        const values = [job_posting_id, name, email, phone, JSON.stringify(documents)];
        const result = await pool.query(query, values);

        // Send confirmation email
        const subject = 'Application Confirmation';
        const text = `Dear ${name},\n\nThank you for applying for the position. We will review your application and contact you soon.`;
        await sendEmail(email, subject, text);

        res.status(201).json({ message: 'Candidate added successfully', candidate: result.rows[0] });
    } catch (err) {
        console.error('Error adding candidate:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all candidates for a specific job posting
exports.getCandidates = async (req, res) => {
    const { job_posting_id, status } = req.query;

    try {
        let query = `SELECT * FROM candidates WHERE job_posting_id = $1`;
        const values = [job_posting_id];

        if (status) {
            query += ` AND status = $2`;
            values.push(status);
        }

        const result = await pool.query(query, values);
        res.status(200).json({ candidates: result.rows });
    } catch (err) {
        console.error('Error fetching candidates:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get a specific candidate by ID
exports.getCandidateById = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `SELECT * FROM candidates WHERE id = $1`;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        res.status(200).json({ candidate: result.rows[0] });
    } catch (err) {
        console.error('Error fetching candidate:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update candidate details or status
exports.updateCandidate = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, documents, status } = req.body;

    try {
        const query = `
            UPDATE candidates
            SET name = $1, email = $2, phone = $3, documents = $4::jsonb, status = $5, created_at = CURRENT_TIMESTAMP
            WHERE id = $6 RETURNING *;
        `;
        const values = [name, email, phone, JSON.stringify(documents), status, id];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        // Send status update email
        const subject = 'Application Status Update';
        const text = `Dear ${name},\n\nYour application status has been updated to: ${status}.`;
        await sendEmail(email, subject, text);

        res.status(200).json({ message: 'Candidate updated successfully', candidate: result.rows[0] });
    } catch (err) {
        console.error('Error updating candidate:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


// Delete a candidate
exports.deleteCandidate = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `DELETE FROM candidates WHERE id = $1 RETURNING *`;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        res.status(200).json({ message: 'Candidate deleted successfully' });
    } catch (err) {
        console.error('Error deleting candidate:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.scheduleInterview = async (req, res) => {
    const { id } = req.params;
    const { date, time, location } = req.body;

    try {
        const query = `SELECT * FROM candidates WHERE id = $1`;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        const candidate = result.rows[0];

        // Send interview email
        const subject = 'Interview Invitation';
        const text = `Dear ${candidate.name},\n\nYou are invited to an interview.\n\nDetails:\nDate: ${date}\nTime: ${time}\nLocation: ${location}\n\nBest regards,\nThe Team.`;
        await sendEmail(candidate.email, subject, text);

        res.status(200).json({ message: 'Interview scheduled and email sent' });
    } catch (err) {
        console.error('Error scheduling interview:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

