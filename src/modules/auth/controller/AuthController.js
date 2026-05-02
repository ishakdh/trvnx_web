import User from '../../../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
    try {
        // 🚀 FIXED: Extracted the new Distributor/SR fields from the frontend request
        const {
            name, phone, password, role, territory, createdBy,
            business_name, father_name, mother_name, address,
            phone_alt, market_area, commissions,
            // 🚀 NEW: SR Panel specific fields (Approvals, Temp Licenses, NID)
            nid_number, documents, approval, temporary_licenses
        } = req.body;

        const existingUser = await User.findOne({ phone });
        if (existingUser) return res.status(400).json({ message: "Identity already exists." });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            phone,
            password: hashedPassword,
            role,
            territory,
            parent_id: createdBy || null,
            business_name,
            father_name,
            mother_name,
            address,
            phone_alt,
            market_area,
            commissions,
            // 🚀 NEW: Added the new fields to be saved in the database
            nid_number,
            documents,
            approval,
            temporary_licenses: temporary_licenses || 0
        });

        await newUser.save();

        // 🎯 COMMISSION RULE: Only Shopkeeper triggers the bonus
        if (role === 'SHOPKEEPER' && createdBy) {
            const ID_BONUS = 500;
            const creator = await User.findById(createdBy);
            if (creator) {
                const targetId = creator.parent_id ? creator.parent_id : creator._id;
                await User.findByIdAndUpdate(targetId, { $inc: { balance: ID_BONUS } });
            }
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

        res.status(200).json({
            token,
            user: { id: user._id, name: user.name, role: user.role, phone: user.phone, balance: user.balance }
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
        // 🚀 FIXED: The React frontend sends 'userId' and 'status' in the body, not as a URL param.
        const { userId, status } = req.body;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        // 🚀 FIXED: Apply the exact status (ACTIVE/LOCKED) requested by the frontend
        user.status = status;
        await user.save();
        res.status(200).json({ message: "Status Updated" });
    } catch (error) {
        res.status(500).json({ message: "Failed" });
    }
};