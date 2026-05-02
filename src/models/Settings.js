import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
    config_name: { type: String, default: "GLOBAL_CONFIG", unique: true },

    // --- Pricing & Promo Matrix ---
    base_license_price: { type: Number, default: 2000 },
    promo_start: { type: Date },
    promo_end: { type: Date },
    promo_type: { type: String, enum: ['NONE', 'FIXED', 'PERCENTAGE'], default: 'NONE' },
    promo_value: { type: Number, default: 0 },

    // --- Dynamic Commission Promo ---
    promo_comm_start: { type: Date },
    promo_comm_end: { type: Date },
    promo_comm_type: { type: String, enum: ['NONE', 'FIXED', 'PERCENTAGE'], default: 'NONE' },
    promo_comm_value: { type: Number, default: 0 },

    // --- Global Default Commissions ---
    default_sr_id_fixed: { type: Number, default: 500 },
    default_sr_id_percent: { type: Number, default: 0 },
    default_dist_id_fixed: { type: Number, default: 200 },
    default_dist_id_percent: { type: Number, default: 5 },

    default_sr_license_fixed: { type: Number, default: 200 },
    default_sr_license_percent: { type: Number, default: 2 },

    // Gateway Config - 🚀 UPDATED WITH ALL 6 GATEWAYS
    allow_cash: { type: Boolean, default: true },
    allow_api: { type: Boolean, default: false },
    allow_personal_sms: { type: Boolean, default: true },

    bkash_api: { type: Boolean, default: false },
    nagad_api: { type: Boolean, default: false },

    bkash_merchant: { type: Boolean, default: false },
    bkash_merchant_number: { type: String, default: "" },

    nagad_merchant: { type: Boolean, default: false },
    nagad_merchant_number: { type: String, default: "" },

    bkash_personal: { type: Boolean, default: false },
    bkash_personal_number: { type: String, default: "" },

    nagad_personal: { type: Boolean, default: false },
    nagad_personal_number: { type: String, default: "" },

    sms_bridge_secret: { type: String, default: "TRVNX_BRIDGE_77" },

    // 🚀 NEW: QR Code Images & Settings (MATCHING FRONTEND EXACTLY)
    qr1_image: { type: String, default: "" },
    qr2_image: { type: String, default: "" },
    active_qr: { type: String, default: "BOTH" }
}, { timestamps: true });

// 🎯 DEFENSIVE EXPORT: Prevents OverwriteModelError
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
export default Settings;