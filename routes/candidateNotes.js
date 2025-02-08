const express = require('express');
const router = express.Router();
const candidateNotesController = require('../controllers/candidateNotesController');


router.post('/', candidateNotesController.addNote); 
router.get('/:candidate_id', candidateNotesController.getNotesByCandidateId); 
router.put('/:id', candidateNotesController.updateNote);
router.delete('/:id', candidateNotesController.deleteNote); 

module.exports = router;
