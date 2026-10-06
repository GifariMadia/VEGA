import fs from 'node:fs';
import path from 'node:path';
import config from '../config/index.js';
import { importExcelFile } from '../services/pythonImportService.js';

function ensureUploadDirectory() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

export async function uploadBudget(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file was uploaded.' });
    }

    ensureUploadDirectory();
    const filePath = req.file.path;
    const result = await importExcelFile({ fileType: 'budget', filePath });

    return res.status(200).json({
      success: true,
      fileType: 'budget',
      fileName: path.basename(filePath),
      result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      fileType: 'budget',
      error: error.message,
    });
  } finally {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_error) {
        // best effort cleanup
      }
    }
  }
}

export async function uploadGl(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file was uploaded.' });
    }

    ensureUploadDirectory();
    const filePath = req.file.path;
    const result = await importExcelFile({ fileType: 'gl', filePath });

    return res.status(200).json({
      success: true,
      fileType: 'gl',
      fileName: path.basename(filePath),
      result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      fileType: 'gl',
      error: error.message,
    });
  } finally {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_error) {
        // best effort cleanup
      }
    }
  }
}

export default {
  uploadBudget,
  uploadGl,
};
