// 🚀 FIXED: Changed '../../../' to '../' so it looks in src/models instead of the C: drive
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {logActivity} from "../utils/logger.js";

export const register = async (req, res) => {
    try {
        const {
            name, phone, password, role, territory, createdBy, parent_id,
            business_name, father_name, mother_name, address,
            phone_alt, market_area, commissions,
            nid_number, documents, approval, temporary_licenses,
            permissions // 🚀 NEW: Catching permissions matrix from frontend
        } = req.body;

        const existingUser = await User.findOne({ phone });
        if (existingUser) return res.status(400).json({ message: "Identity already exists." });

        const hashedPassword = await bcrypt.hash(password, 10);

        // 🔥 THE ORPHAN FIX: If frontend sends undefined, intercept the token to force the parent link!
        let tokenUserId = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'TRVNX_SECRET');
                tokenUserId = decoded.id;
            } catch (err) {}
        }

        const actualParentId = createdBy || parent_id || (req.user ? (req.user.id || req.user._id) : null) || tokenUserId || null;

        const newUser = new User({
            name,
            phone,
            password: hashedPassword,
            role,
            territory,
            parent_id: actualParentId,
            business_name,
            father_name,
            mother_name,
            address,
            phone_alt,
            market_area,
            commissions,
            nid_number,
            documents,
            approval,
            temporary_licenses: temporary_licenses || 0,
            permissions: permissions || []
        });

        await newUser.save();

        // 🚀 TRIGGER ACTIVITY LOG FOR USER CREATION
        if (req.user || actualParentId) {
            await logActivity(
                req.user || { _id: actualParentId }, // Fallback if req.user is missing
                'CREATE_USER',
                newUser._id,
                `Registered new ${role}: ${name} (${phone})`
            );
        }

        res.status(201).json({ message: `${role}_SUCCESSFULLY_DEPLOYED` });

    } catch (error) {
        res.status(500).json({ message: "Deployment Failed", error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });

        if (!user) return res.status(404).json({ message: "IDENTITY NOT FOUND" });
        if (user.status !== 'ACTIVE') return res.status(403).json({ message: "ACCOUNT LOCKED." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "INVALID AUTH" });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'TRVNX_SECRET',
            { expiresIn: '24h' }
        );

        // 🚀 TRIGGER ACTIVITY LOG FOR LOGIN
        await logActivity(
            user,
            'LOGIN',
            user._id,
            `User logged into the system.`
        );

        res.status(200).json({
            token,
            // 🚀 FIXED: Added permissions so the frontend dashboard menus load properly!
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                phone: user.phone,
                balance: user.balance,
                permissions: user.permissions
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Login Error" });
    }
};

export const getAllOperators = async (req, res) => {
    try {
        const operators = await User.find({}, '-password').sort({ createdAt: -1 });
        res.status(200).json(operators);
    } catch (error) {
        res.status(500).json({ message: "Fetch failed" });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const { userId, status } = req.body;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        user.status = status;
        await user.save();
        res.status(200).json({ message: "Status Updated" });
    } catch (error) {
        res.status(500).json({ message: "Failed" });
    }
};

// 🚀 AuthController.js - Update the mirrorUser function
export const mirrorUser = async (req, res) => {
    try {
        const { targetUserId } = req.body;

        // 🚀 CRITICAL: Fetch the user FRESH from the Database
        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({ message: "Target identity not found" });
        }

        // 🚀 CRITICAL: We MUST put the LATEST permissions into the token
        const jwt = (await import('jsonwebtoken')).default;
        const mirrorToken = jwt.sign(
            {
                id: targetUser._id,
                role: targetUser.role,
                permissions: targetUser.permissions, // <--- Using the FRESH DB values
                isImpersonated: true
            },
            process.env.JWT_SECRET || 'TRVNX_SECRET',
            { expiresIn: '2h' }
        );

        res.status(200).json({
            token: mirrorToken,
            user: {
                id: targetUser._id,
                name: targetUser.name,
                permissions: targetUser.permissions // Sending fresh permissions to frontend
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Mirror Protocol Failed", error: error.message });
    }
};