const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const aiController = require('../controllers/aiController');

const router = express.Router();

// Configure Multer for file uploads
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Define API endpoints
router.post('/generate-code', aiController.generateCode);
router.post('/math-reasoning', aiController.getMathReasoning);
router.post('/coding-task', aiController.solveCodingTask);
router.post('/youtube-summarize', aiController.summarizeYoutubeVideo);
router.post('/chat', aiController.handleChat);
router.post('/image-to-text', upload.single('image'), aiController.imageToText);
router.post('/explainer', aiController.getExplainer);

module.exports = router;