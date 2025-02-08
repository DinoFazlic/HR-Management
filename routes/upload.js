const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Ensure this matches your folder structure
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// File upload route
router.post('/upload-files', upload.array('file', 1), (req, res) => {
    try {
        const fileNames = req.files.map(file => file.filename);
        res.json({ message: 'Files uploaded successfully', files: fileNames });
    } catch (err) {
        console.error('Error uploading files:', err.message);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

module.exports = router;
