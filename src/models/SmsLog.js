import mongoose from "mongoose";

const smsLogSchema = new mongoose.Schema({
    // unique: true prevents the SAME TrxID from being synced twice by the Android app
    txid: { type: String, unique: true, required: true },
    amount: { type: Number, required: true },
    sender_number: String,
    raw_sms: String,
    is_claimed: { type: Boolean, default: false },

    // Updated to 10 Days (10 * 24 * 60 * 60 * 1000 ms)
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        index: { expires: 0 } // Deletes the record from DB exactly 10 days after creation
    }
}, { timestamps: true });

export default mongoose.model("SmsLog", smsLogSchema);