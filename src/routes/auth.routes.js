import express from 'express';
// Make sure this path to AuthController is correct based on your folder structure!
import { register, login } from '../modules/auth/controller/AuthController.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

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