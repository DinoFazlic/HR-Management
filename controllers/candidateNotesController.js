 const pool = require('../config/db');

// Add a new note for a candidate
exports.addNote = async (req, res) => {
    const { candidate_id, note } = req.body;

    try {
        const query = `
            INSERT INTO candidate_notes (candidate_id, note)
            VALUES ($1, $2) RETURNING *;
        `;
        const values = [candidate_id, note];
        const result = await pool.query(query, values);

        res.status(201).json({ message: 'Note added successfully', note: result.rows[0] });
    } catch (err) {
        console.error('Error adding note:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all notes for a candidate
exports.getNotesByCandidateId = async (req, res) => {
    const { candidate_id } = req.params;

    try {
        const query = `
            SELECT * FROM candidate_notes WHERE candidate_id = $1 ORDER BY created_at DESC;
        `;
        const result = await pool.query(query, [candidate_id]);

        res.status(200).json({ notes: result.rows });
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update a specific note
exports.updateNote = async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;

    try {
        const query = `
            UPDATE candidate_notes
            SET note = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 RETURNING *;
        `;
        const result = await pool.query(query, [note, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.status(200).json({ message: 'Note updated successfully', note: result.rows[0] });
    } catch (err) {
        console.error('Error updating note:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Delete a specific note
exports.deleteNote = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            DELETE FROM candidate_notes WHERE id = $1 RETURNING *;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.status(200).json({ message: 'Note deleted successfully' });
    } catch (err) {
        console.error('Error deleting note:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
