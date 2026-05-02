import Sale from "../models/Sale.js";
import User from "../models/User.js";
import { logActivity } from "../middlewares/activityLogger.js";

// Option 01: Global Search Terminal
export const globalSearch = async (req, res) => {
    const { query } = req.query;
    try {
        const salesResult = await Sale.find({
            $or: [
                { customer_phone: query },
                { imei1: query },
                { imei2: query }
            ]
        }).populate('shopkeeper_id', 'name phone');

        res.json(salesResult);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Option 02: Manual Override (Remote Lock/Unlock)
export const remoteOverride = async (req, res) => {
    const { imei, action, reason } = req.body; // action: LOCK or UNLOCK

    try {
        const sale = await Sale.findOne({ $or: [{ imei1: imei }, { imei2: imei }] });
        if (!sale) return res.status(404).json({ message: "Device not found in active sales" });

        // 1. Log the activity with mandatory reason
        await logActivity(req, `${action}_OVERRIDE`, sale._id, imei, reason);

        // 2. Update sale status
        sale.pending_command = action;
        await sale.save();

        // 3. Send real-time command via Socket.io Handshake
        const socketId = global.activeDevices.get(imei);
        if (socketId) {
            global.io.to(socketId).emit("command_received", {
                action: action,
                reason: reason
            });
            return res.json({ message: `Command ${action} sent to device successfully.` });
        }

        res.json({ message: `Command ${action} queued. Device is currently offline.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Option 03: Dispute Flag Logic
export const toggleDispute = async (req, res) => {
    const { saleId, status, reason } = req.body;
    try {
        const sale = await Sale.findById(saleId);
        if (!sale) return res.status(404).json({ message: "Sale not found" });

        sale.dispute_flag = status;
        await sale.save();

        await logActivity(req, 'DISPUTE_TOGGLE', sale._id, sale.imei1, reason);

        res.json({ message: `Dispute flag set to ${status}.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};