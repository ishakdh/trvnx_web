import ActivityLog from "../models/ActivityLog.js";

// 🚀 UNIVERSAL ACTIVITY LOGGER
export const logActivity = async (user, action_type, target_id = null, reason = "System Action", target_imei = null, ip_address = null, device_info = null) => {
    try {
        if (!user) return; // Fail silently if no user object is passed

        const newLog = new ActivityLog({
            performed_by: user._id || user.id,
            action_type,
            target_id,
            target_imei,
            reason,
            ip_address,
            device_info
        });

        await newLog.save();
    } catch (error) {
        console.error("Failed to log activity:", error.message);
    }
};