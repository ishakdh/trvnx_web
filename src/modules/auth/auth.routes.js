import express from "express";
import { role } from "../../middlewares/role.js";
import { auth } from "../../middlewares/auth.js";

// 🚀 FIXED: This import is now correct relative to its new location
import {
    register,
    login,
    getAllOperators,
    toggleStatus
} from "./controller/AuthController.js";

import UserController from "../core/user/UserController.js";

const router = express.Router();

// 🚀 FIXED: Mapped the routes directly to the named functions
router.post("/register", register);
router.post("/login", login);

// 🚀 FIXED: These now perfectly connect to the AdminDashboard fetch requests
router.get("/operators", getAllOperators);
router.post("/toggle-status", toggleStatus);

// Protected Core User Route
router.get(
    "/users",
    auth,
    role("admin"),
    UserController.index
);

export default router;