import User from "../models/User.js";
import Sale from "../models/Sale.js";
import Target from "../models/Target.js";

// Option 02: Territory Heatmap Data
export const getTerritoryStats = async (req, res) => {
    try {
        const stats = await User.aggregate([
            { $match: { role: 'SHOPKEEPER' } },
            {
                $group: {
                    _id: {
                        division: "$territory.division",
                        district: "$territory.district"
                    },
                    totalShops: { $sum: 1 },
                    activeShops: { $sum: { $cond: [{ $eq: ["$kyc_status", "ACTIVE"] }, 1, 0] } }
                }
            },
            { $sort: { "_id.division": 1, "_id.district": 1 } }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Option 04: Performance KPI Tracking
export const getPerformanceReport = async (req, res) => {
    try {
        const report = await Sale.aggregate([
            { $match: { status: 'ACTIVATED' } },
            {
                $group: {
                    _id: "$shopkeeper_id",
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: "$total_price" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "shopkeeper"
                }
            },
            { $unwind: "$shopkeeper" }
        ]);
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🔥 FIXED: Create Marketing Target (Strict Unit & Identity Mapping)
export const createTarget = async (req, res) => {
    try {
        // Extract exact payload sent from the new React frontend
        const {
            name, target_name, startDate, start_date, endDate, end_date,
            idTarget, id_target, licenseTarget, license_target,
            bonus, bonus_amount, distributor_id, sr_id, created_by
        } = req.body;

        // Safely capture exact unit numbers without multiplying them
        const finalIdTarget = Number(id_target || idTarget) || 0;
        const finalLicenseTarget = Number(license_target || licenseTarget) || 0;

        const newTarget = new Target({
            campaign_name: target_name || name || 'Marketing Campaign',
            target_name: target_name || name,
            start_date: new Date(start_date || startDate),
            end_date: new Date(end_date || endDate),

            // 🔥 Map explicit unit counts directly to the new Schema fields
            id_target: finalIdTarget,
            license_target: finalLicenseTarget,

            // Set currency values to 0 to prevent UI bugs
            target_amount: 0,
            sales_amount: 0,
            target_bonus: Number(bonus_amount || bonus) || 0,

            // Map strict hierarchy identity
            created_by: created_by || req.user?._id || req.user?.id,
            distributor_id: distributor_id || null,
            sr_id: sr_id || null,

            status: 'ACTIVE'
        });

        await newTarget.save();

        res.status(201).json({ message: 'Target created successfully', target: newTarget });
    } catch (error) {
        console.error("Error creating target:", error);
        res.status(500).json({ message: 'Failed to create target', error: error.message });
    }
};

// Fetch Marketing Targets
export const getTargets = async (req, res) => {
    try {
        const targets = await Target.find().sort({ createdAt: -1 });
        res.status(200).json({ data: targets });
    } catch (error) {
        console.error("Error fetching targets:", error);
        res.status(500).json({ message: 'Failed to fetch targets', error: error.message });
    }
};

// Update Target
export const updateTarget = async (req, res) => {
    try {
        const targetId = req.body._id;

        if (!targetId) {
            return res.status(400).json({ message: "Target ID is required for update" });
        }

        const updatedTarget = await Target.findByIdAndUpdate(
            targetId,
            { $set: req.body },
            { new: true }
        );

        if (!updatedTarget) {
            return res.status(404).json({ message: "Target not found in database" });
        }

        res.status(200).json({ message: 'Target updated successfully', target: updatedTarget });
    } catch (error) {
        console.error("Error updating target:", error);
        res.status(500).json({ message: 'Failed to update target', error: error.message });
    }
};