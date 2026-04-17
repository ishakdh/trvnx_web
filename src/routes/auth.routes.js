import express from "express";
import { login, enterShadowMode } from "../controllers/auth.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
// 🚀 FIX 1: You MUST import the User model here
import User from "../models/user.model.js";

const router = express.Router();

router.post("/login", login);
router.post("/shadow", protect, authorize('ADMIN'), enterShadowMode);

// 🚀 FIX 2: Added the route with correct middleware 'authorize'
router.post('/update-user', protect, authorize('ADMIN'), async (req, res) => {
    try {
        const { userId, name, phone, role, permissions } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update the identity fields
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (role) user.role = role;

        // 🚀 This saves the new permissions array from the frontend
        if (permissions) user.permissions = permissions;

        await user.save();
        res.json({ message: "User updated successfully", user });
    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

export default router;