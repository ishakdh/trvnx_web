import express from "express";
import { login, enterShadowMode } from "../controllers/auth.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/shadow", protect, authorize('action'), enterShadowMode);

export default router;