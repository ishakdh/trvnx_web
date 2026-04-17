import express from "express";
import { login, enterShadowMode } from "../controllers/auth.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
// 🚀 FIX 1: Import your User model so the code can find users in MongoDB
import User from "../models/user.model.js";

const router = express.Router();

router.post("/login", login);
router.post("/shadow", protect, authorize('ADMIN'), enterShadowMode);

// 🚀 THE REPAIRED UPDATE ROUTE
router.post('/update-user', protect, authorize('ADMIN'), async (req, res) => {
    try {
        const { userId, name, phone, role, permissions } = req.body;

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Apply updates
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (role) user.role = role;

        // 🚀 This updates the permission array we added to the frontend
        if (permissions) user.permissions = permissions;

        await user.save();

        // Return success
        res.json({ message: "User updated successfully", user });
    } catch (error) {
        console.error("CRITICAL BACKEND ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

export default router;