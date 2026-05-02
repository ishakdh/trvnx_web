import express from 'express';
// Always include the .js extension in ESM
import { getAllDistricts, getThanasByDistrict } from '../controllers/locationController.js';

const router = express.Router();

router.get('/districts', getAllDistricts);
router.get('/thanas/:districtName', getThanasByDistrict);

// 🔥 This line is the fix for your SyntaxError
export default router;