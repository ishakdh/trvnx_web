import express from "express";
import { generateSale, activateSale } from "../controllers/sale.controller.js";
import { protect, checkTrialLimit } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Shopkeeper needs protection and Trial Limit check
router.post("/generate", protect, checkTrialLimit, generateSale);

// This route is called by the Android S21+ App
router.post("/activate", activateSale);

export default router;