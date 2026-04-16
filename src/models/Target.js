import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
    campaign_name: { type: String, required: true },
    target_role: { type: String, enum: ['SR', 'DISTRIBUTOR'], default: 'SR' },

    // Time Duration
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },

    // The Condition Ladder
    conditions: [{
        sales_count: { type: Number, required: true },
        bonus_amount: { type: Number, required: true }
    }],

    is_active: { type: Boolean, default: true },

    // 🔥 NEW: Explicit Target Fields for Matrix
    target_name: { type: String },
    id_target: { type: Number, default: 0 },         // Added for ID count
    license_target: { type: Number, default: 0 },    // Added for License count
    target_amount: { type: Number, default: 0 },     // Legacy/Money
    sales_amount: { type: Number, default: 0 },
    target_bonus: { type: Number, default: 0 },

    // Identity Tracking
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    distributor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sr_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Display Names for Tables
    distributor_name: { type: String },
    sr_name: { type: String },
    shop_name: { type: String },
    market_area: { type: String },

    // Raw Form Data
    target_markets: [{ type: String }],
    target_level: { type: String, enum: ['DISTRIBUTOR', 'SR', 'SHOPKEEPER'], default: 'DISTRIBUTOR' },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'FAILED'], default: 'ACTIVE' }

}, { timestamps: true });

const Target = mongoose.models.Target || mongoose.model('Target', targetSchema);
export default Target;