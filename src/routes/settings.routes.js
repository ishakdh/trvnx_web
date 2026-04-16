import express from "express";
import { getSettings, updateSettings, createLicenseFee, getAllLicenseFees, toggleLicenseFeeStatus } from "../controllers/settings.controller.js";

const router = express.Router();

// Maps to /api/settings/
router.get("/", getSettings);
router.patch("/", updateSettings);

// 🚀 NEW: MULTIPLE LICENSE FEE & OFFER ROUTES (Maps to /api/settings/license-fees)
router.post("/license-fees", createLicenseFee);
router.get("/license-fees", getAllLicenseFees);

// 🔥 NEW: Toggle Status Route for LIVE/CLOSE
router.patch("/license-fees/:id/toggle-status", toggleLicenseFeeStatus);

export default router;