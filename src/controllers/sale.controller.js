import Sale from "../models/Sale.js";
import User from "../models/User.js";
import Device from "../models/Device.js";
import crypto from "crypto";
// 🔥 NEW: Import Target model for Marketing Matrix
import Target from '../models/Target.js';

// 🔥 NEW Helper: Update Marketing Targets automatically
const updateMarketingTargets = async (userId, amount) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        let distId = null;
        let srId = null;

        if (user.role === 'SR') {
            srId = user._id;
            distId = user.parent_id;
        } else if (user.role === 'DISTRIBUTOR') {
            distId = user._id;
        } else if (user.role === 'SHOPKEEPER') {
            const parent = await User.findById(user.parent_id);
            if (parent) {
                if (parent.role === 'SR') {
                    srId = parent._id;
                    distId = parent.parent_id;
                } else if (parent.role === 'DISTRIBUTOR') {
                    distId = parent._id;
                }
            }
        }

        const now = new Date();
        const queries = [];

        if (distId) queries.push({ target_level: 'DISTRIBUTOR', status: 'ACTIVE', start_date: { $lte: now }, end_date: { $gte: now }, $or: [{ created_by: distId }, { distributor_id: distId }, { target_markets: `DIST: ${user.name}` }] });
        if (srId) queries.push({ target_level: 'SR', status: 'ACTIVE', start_date: { $lte: now }, end_date: { $gte: now }, $or: [{ created_by: srId }, { sr_id: srId }, { target_markets: `SR: ${user.name}` }] });

        if (queries.length > 0) {
            const activeTargets = await Target.find({ $or: queries });
            for (let target of activeTargets) {
                target.sales_amount += amount;
                await target.save();
            }
        }
    } catch (err) {
        console.error("Marketing Target Update Failed:", err);
    }
};

// Option 02: Generate New Sale & Mint Key
export const generateSale = async (req, res) => {
    try {
        const { customer_name, customer_phone, imei1, imei2, total_price, installments, auto_lock } = req.body;

        // 1. Check if Shopkeeper has enough balance for the fee
        if (req.user.current_balance < req.user.license_key_fee) {
            return res.status(400).json({ message: "Insufficient balance to generate key" });
        }

        // 2. Generate 16-digit unique key
        const license_key = crypto.randomBytes(8).toString('hex').toUpperCase();

        const newSale = new Sale({
            shopkeeper_id: req.user._id,
            customer_name, customer_phone, imei1, imei2,
            total_price, installments, auto_lock,
            license_key
        });

        await newSale.save();

        // Note: NO balance is deducted yet!
        res.status(201).json({
            message: "License key generated. Valid for 60 minutes.",
            license_key
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Android App Activation Handshake
export const activateSale = async (req, res) => {
    const { license_key, device_imei } = req.body;

    try {
        const sale = await Sale.findOne({ license_key, status: 'UNUSED' }).populate('shopkeeper_id');
        if (!sale) return res.status(404).json({ message: "Invalid or already used key" });

        // 3. 60-Minute Expiry Check
        const minutesPassed = (new Date() - sale.createdAt) / 60000;
        if (minutesPassed > 60) {
            sale.status = 'EXPIRED';
            await sale.save();
            return res.status(400).json({ message: "Key expired. Please generate a new one." });
        }

        // 4. Verification & Deduction
        const shopkeeper = sale.shopkeeper_id;
        const deductionAmount = shopkeeper.license_key_fee || 2000;
        shopkeeper.current_balance -= deductionAmount;
        await shopkeeper.save();

        // 5. Trigger Commission for SR and Distributor
        if (shopkeeper.parent_id) {
            const parent = await User.findById(shopkeeper.parent_id);
            if (parent) {
                parent.commission_wallet += 100; // Example fixed commission
                await parent.save();
            }
        }

        // 🔥 NEW: Update Marketing Targets
        await updateMarketingTargets(shopkeeper._id, deductionAmount);

        sale.status = 'ACTIVATED';
        sale.activated_at = new Date();
        await sale.save();

        // 6. Update Device Whitelist to SOLD
        await Device.findOneAndUpdate({ imei1: device_imei }, { status: 'SOLD' });

        res.json({ message: "Device activated successfully. Balance deducted." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};