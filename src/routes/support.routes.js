import express from "express";
import { globalSearch, toggleDispute, remoteOverride } from "../controllers/support.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Option 01: Search
router.get("/search", protect, authorize('read'), globalSearch);

// Option 03: Dispute
router.post("/dispute-toggle", protect, authorize('edit'), toggleDispute);

// Option 02: Manual Override
router.post("/override", protect, authorize('action'), remoteOverride);

export default router;