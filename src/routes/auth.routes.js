import express from "express";
import { login, enterShadowMode } from "../controllers/auth.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
// 🚀 FIX 1: Import your User model (Adjust path if necessary)
import User from "../models/user.model.js";

const router = express.Router();

router.post("/login", login);
router.post("/shadow", protect, authorize('ADMIN'), enterShadowMode);

// 🚀 FIX 2: Use authorize('ADMIN') instead of the undefined 'admin'
router.post('/update-user', protect, authorize('ADMIN'), async (req, res) => {
    try {
        const { userId, name, phone, role, permissions } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update fields
        user.name = name || user.name;
        user.phone = phone || user.phone;
        user.role = role || user.role;

        // 🚀 This handles the permissions array we added to the frontend
        if (permissions) user.permissions = permissions;

        await user.save();
        res.json({ message: "User updated successfully", user });
    } catch (error) {
        // 🚀 FIX 3: Detailed error logging helps you debug faster
        console.error("Update Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

export default router;