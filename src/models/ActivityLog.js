import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // 🚀 FIXED: Removed the 'enum' restriction completely.
    // Now it will accept EVERY action without rejecting or skipping anything.
    action_type: { type: String, required: true },

    target_id: { type: mongoose.Schema.Types.ObjectId },
    target_imei: String,
    reason: { type: String, required: true },
    ip_address: String,
    device_info: String
}, { timestamps: true });

export default mongoose.model("ActivityLog", activityLogSchema);