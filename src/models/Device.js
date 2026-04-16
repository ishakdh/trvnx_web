// File Location: models/Device.js
import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
    customer_name: { type: String, required: true },
    father_name: { type: String },
    mother_name: { type: String },
    customer_phone: { type: String, required: true },
    customer_address: { type: String, required: true },
    product_name: { type: String, required: true },
    product_model: { type: String, required: true },
    imei: { type: String, default: "" }, // 🚀 Master Locked IMEI (Picked up on activation)
    imei2: { type: String },
    real_imei1: { type: String, default: "" },
    real_imei2: { type: String, default: "" },
    total_price: { type: Number, required: true },
    down_payment: { type: Number, default: 0 },
    monthly_emi: { type: Number, required: true },
    installment_months: { type: Number, required: true },
    next_due_date: { type: Date, required: true },
    paid_so_far: { type: Number, default: 0 },
    next_emi_override: { type: Number, default: null },

    customer_photo: { type: String },
    nid_card: { type: String },

    payment_history: [{
        amount: Number,
        date: { type: Date, default: Date.now },
        remark: String
    }],

    offline_otps: [{
        month: Number,
        open_otp: String,
        ex_otp: String,
        is_used: { type: Boolean, default: false }
    }],

    license_key: { type: String, unique: true },
    // 🚀 Added 'UNINSTALLED' to enum
    license_status: { type: String, enum: ['PENDING', 'ACTIVATED', 'EXPIRED', 'UNINSTALLED'], default: 'PENDING' },
    shopkeeper_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fcm_token: { type: String },
    is_locked: { type: Boolean, default: false },
    last_heartbeat: { type: Date },
    diagnostics: {
        battery_level: { type: Number, default: 0 },
        signal_strength: { type: String, default: "N/A" },
        last_location: {
            lat: { type: Number },
            lng: { type: Number },
            updatedAt: { type: Date }
        }
    }
}, { timestamps: true });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);
export default Device;