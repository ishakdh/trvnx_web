import ActivityLog from "../models/ActivityLog.js";

// 🚀 FIXED: The arguments now perfectly match what device.controller.js is sending
export const logActivity = async (user, actionType, targetId, reason, targetImei) => {
    try {
        // Safely extract the user ID without crashing if the token drops
        const performedBy = user && user._id ? user._id : null;

        const log = new ActivityLog({
            performed_by: performedBy,
            action_type: actionType,
            target_id: targetId,
            target_imei: targetImei, // Fixed the flipped order
            reason: reason,          // Fixed the flipped order
            ip_address: "Internal API",
            device_info: "Trvnx Dashboard"
        });

        await log.save();
    } catch (error) {
        console.error("Audit Log Error:", error.message);
    }
};