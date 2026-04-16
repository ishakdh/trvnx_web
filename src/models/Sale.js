import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
    shopkeeper_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer_name: { type: String, required: true },
    customer_phone: { type: String, required: true },
    imei1: { type: String, required: true },
    imei2: { type: String, required: true },
    total_price: { type: Number, required: true },
    down_payment: { type: Number, required: true },
    installments: { type: Number, required: true }, // 1-24 months
    auto_lock: { type: Boolean, default: true },

    // Heartbeat & Health Logic
    last_heartbeat: { type: Date, default: Date.now },
    device_status: {
        type: String,
        enum: ['GREEN', 'YELLOW', 'RED'],
        default: 'GREEN'
    },

    // License Key Details
    license_key: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ['UNUSED', 'ACTIVATED', 'EXPIRED'],
        default: 'UNUSED'
    },
    activated_at: { type: Date },

    // EMI Scheduling & Automation
    next_emi_date: { type: Date },
    total_paid: { type: Number, default: 0 },
    payment_status: {
        type: String,
        enum: ['PENDING', 'UP_TO_DATE', 'OVERDUE', 'FULL_PAID'],
        default: 'PENDING'
    },

    // Tracking for Call Center
    dispute_flag: { type: Boolean, default: false },

    // Commands for Socket.io Handshake
    pending_command: {
        type: String,
        enum: ['NONE', 'LOCK', 'UNLOCK', 'FULL_UNINSTALL'],
        default: 'NONE'
    }
}, { timestamps: true });

export default mongoose.model("Sale", saleSchema);