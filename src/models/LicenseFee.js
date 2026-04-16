import mongoose from "mongoose";

const licenseFeeSchema = new mongoose.Schema({
    // Type of fee (Standard vs. Promotional Offer)
    type: { type: String, enum: ['STANDARD_FEE', 'PROMOTIONAL_OFFER'], default: 'STANDARD_FEE' },

    // Core Names
    name: { type: String, required: true },
    offer_name: { type: String },

    // Time Duration for Offers
    start_date: { type: Date },
    end_date: { type: Date },

    // Advanced Market Targeting Arrays (e.g., ["DIST: Rafik", "DISTRICT: Dhaka"])
    target_markets: [{ type: String }],

    // Pricing Structure
    price_type: { type: String, enum: ['FIXED', 'PERCENTAGE'], default: 'FIXED' },
    price_value: { type: Number, default: 0 },
    fee_amount: { type: Number, default: 0 },

    // Status Tracker
    status: { type: String, enum: ['LIVE', 'CLOSE'], default: 'LIVE' },

    // Keeping your original fields just in case legacy data depends on it
    target_type: { type: String, enum: ['ALL', 'DISTRIBUTOR_SR', 'SHOPKEEPER'] },
    target_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

}, { timestamps: true, strict: false }); // strict: false added to ensure dynamic frontend fields save correctly

const LicenseFee = mongoose.models.LicenseFee || mongoose.model('LicenseFee', licenseFeeSchema);
export default LicenseFee;