import ActivityLog from "../models/ActivityLog.js";

export const logActivity = async (req, actionType, targetId, targetImei, reason) => {
    try {
        const log = new ActivityLog({
            performed_by: req.user._id,
            action_type: actionType,
            target_id: targetId,
            target_imei: targetImei,
            reason: reason,
            ip_address: req.ip || req.headers['x-forwarded-for'],
            device_info: req.headers['user-agent']
        });
        await log.save();
    } catch (error) {
        console.error("Audit Log Error:", error.message);
    }
};