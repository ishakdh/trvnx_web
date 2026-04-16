import express from "express";
import { getTerritoryStats, getPerformanceReport, createTarget, getTargets, updateTarget } from "../controllers/marketing.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Only roles with 'read' permission can see the map
router.get("/territory-map", protect, authorize('read'), getTerritoryStats);
router.get("/performance-kpi", protect, authorize('read'), getPerformanceReport);

// 🔥 NEW: Marketing Target Creation and Retrieval Routes
router.post("/create-target", protect, createTarget);
router.get("/targets", protect, getTargets);

// 🚀 THE FIX: Added the update route matching the frontend's exact URL
router.put("/update-target", protect, updateTarget);

export default router;