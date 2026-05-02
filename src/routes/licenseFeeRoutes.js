import express from 'express';
import { getAllLicenseFees } from '../controllers/licenseFeeController.js';

const router = express.Router();

// Maps to GET /api/settings/license-fees (or your base path)
router.get('/', getAllLicenseFees);

// ... existing POST / route for creating ...

export default router;