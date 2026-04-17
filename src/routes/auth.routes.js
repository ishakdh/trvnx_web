import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import User from '../models/User.js';

// 🚀 FIXED: Pointed the import exactly to your middlewares folder where your controller lives!
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

// 🚀 THE MISSING ROUTES! This fixes the 404 /operators error on the frontend!
router.get('/operators', protect, authorize('ADMIN'), getAllOperators);
router.post('/toggle-status', protect, authorize('ADMIN'), toggleStatus);
router.post('/shadow', protect, authorize('ADMIN'), mirrorUser);

// 🚀 THE UPDATE ROUTE
router.post('/update-user', protect, authorize('ADMIN'), async (req, res) => {
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