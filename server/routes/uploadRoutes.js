import express from 'express';
import multer from 'multer';
import config from '../config/index.js';
import { uploadBudget, uploadGl } from '../controllers/uploadController.js';

const router = express.Router();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${timestamp}_${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/budget', upload.single('file'), uploadBudget);
router.post('/gl', upload.single('file'), uploadGl);

export default router;
