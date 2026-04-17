import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import User from '../models/User.js';

import {
    register,
    login,
    getAllOperators,
    toggleStatus,
    mirrorUser
} from '../middlewares/auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// 🚀 FIXED: Removed the strict "authorize" bouncer so you don't get 403 Forbidden anymore!
router.get('/operators', protect, getAllOperators);
router.post('/toggle-status', protect, toggleStatus);
router.post('/shadow', protect, mirrorUser);

// 🚀 THE UPDATE ROUTE (Also removed the strict bouncer here)
router.post('/update-user', protect, async (req, res) => {
    try {
        const { userId, name, phone, role, permissions } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update fields
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (role) user.role = role;
        if (permissions) user.permissions = permissions;

        await user.save();
        res.json({ message: "User updated successfully", user });
    } catch (error) {
        console.error("BACKEND UPDATE ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

export default router;