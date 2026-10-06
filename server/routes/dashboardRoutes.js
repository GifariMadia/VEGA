import express from 'express';
import { getBudget, getActual, getSummary, getAudit, getOverview } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/budget', getBudget);
router.get('/actual', getActual);
router.get('/summary', getSummary);
router.get('/audit', getAudit);
router.get('/overview', getOverview);

export default router;
