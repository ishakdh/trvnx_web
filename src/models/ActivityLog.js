import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
    // 🚀 THE FINAL FIX: Changed required to false!
    // Now Mongoose will let the system save the log even if there is no specific User ID.
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

    action_type: { type: String, required: true },
    target_id: { type: mongoose.Schema.Types.ObjectId },
    target_imei: String,
    reason: { type: String, required: true },
    ip_address: String,
    device_info: String
}, { timestamps: true });

export default mongoose.model("ActivityLog", activityLogSchema);