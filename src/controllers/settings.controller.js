import Settings from "../models/Settings.js";
import LicenseFee from "../models/LicenseFee.js";

// 1. Fetch current settings (GET)
export const getSettings = async (req, res) => {
    try {
        // Look for the global config, if it doesn't exist, create a default one automatically
        let settings = await Settings.findOne({ config_name: "GLOBAL_CONFIG" });
        if (!settings) {
            settings = await Settings.create({ config_name: "GLOBAL_CONFIG" });
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch settings", error: error.message });
    }
};

// 2. Update settings from Admin Dashboard (PATCH)
export const updateSettings = async (req, res) => {
    try {
        const updatedSettings = await Settings.findOneAndUpdate(
            { config_name: "GLOBAL_CONFIG" },
            { $set: req.body },
            { new: true, upsert: true } // Upsert ensures it creates one if missing
        );
        res.status(200).json(updatedSettings);
    } catch (error) {
        res.status(500).json({ message: "Failed to update settings", error: error.message });
    }
};

// ---------------------------------------------------------
// 🚀 NEW: MULTIPLE LICENSE FEE & PROMO OFFER LOGIC
// ---------------------------------------------------------

export const createLicenseFee = async (req, res) => {
    try {
        const {
            type, name, offer_name, start_date, end_date,
            target_markets, price_type, price_value, fee_amount, status
        } = req.body;

        // Since the Mongoose schema might not have all these new fields yet,
        // we pass them dynamically. (Note: Make sure your LicenseFee.js model has strict: false
        // OR update the schema to include these fields!)
        const newFee = new LicenseFee({
            type: type || 'STANDARD_FEE',
            name: name,
            offer_name: offer_name || '',
            start_date: start_date ? new Date(start_date) : null,
            end_date: end_date ? new Date(end_date) : null,
            target_markets: target_markets || [],
            price_type: price_type || 'FIXED',
            price_value: price_value || 0,
            fee_amount: fee_amount || 0,
            status: status || 'LIVE'
        });

        await newFee.save();
        res.status(201).json({ message: "License configuration deployed successfully", data: newFee });
    } catch (error) {
        console.error("Error saving license fee:", error);
        res.status(500).json({ message: "Failed to create license configuration", error: error.message });
    }
};

export const getAllLicenseFees = async (req, res) => {
    try {
        // Fetch all fees and sort by newest first
        const fees = await LicenseFee.find().sort({ createdAt: -1 });
        res.status(200).json(fees);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch license fees", error: error.message });
    }
};

// Toggle LIVE / CLOSE status
export const toggleLicenseFeeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['LIVE', 'CLOSE'].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Must be LIVE or CLOSE." });
        }

        const updatedFee = await LicenseFee.findByIdAndUpdate(
            id,
            { status: status },
            { new: true }
        );

        if (!updatedFee) return res.status(404).json({ message: "Configuration not found" });

        res.status(200).json({ message: "Status updated successfully", data: updatedFee });
    } catch (error) {
        res.status(500).json({ message: "Failed to update status", error: error.message });
    }
};