import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // 🚀 NEW: Added fields for Distributor / SR Profiles
    business_name: { type: String },
    father_name: { type: String },
    mother_name: { type: String },
    phone_alt: { type: String },

    // 🚀 NEW: Fields for Shopkeeper created by SR (Approvals & Docs)
    nid_number: { type: String },
    documents: {
        photo: { type: String },
        nid: { type: String },
        trade_license: { type: String }
    },
    approval: {
        status: {
            type: String,
            enum: ['APPROVED', 'WAITING_DISTRIBUTOR', 'WAITING_ADMIN', 'REJECTED'],
            default: 'APPROVED'
        },
        requested_at: { type: Date }
    },
    temporary_licenses: { type: Number, default: 0 },

    // 🚀 NEW: Added nested Address Object
    address: {
        line1: String,
        line2: String,
        division: String,
        district: String,
        thana: String
    },

    // 🚀 NEW: Added nested Market Area Object
    market_area: {
        districts: [String],
        thanas: [String],
        market_name: String
    },

    current_balance: { type: Number, default: 0, min: 0 },
    total_recharged: { type: Number, default: 0 },
    commission_earned: { type: Number, default: 0 },
    custom_license_fee: { type: Number, default: 300 },


    // 🚀 UPDATED: Merged your existing commission logic with the new Distributor fields
    commissions: {
        id_gen: { fixed: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
        license: { fixed: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
        per_user: { type: Number, default: 0 },
        per_license: { type: Number, default: 0 },
        salary: { type: Number, default: 0 }
    },

    role: {
        type: String,
        enum: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'MARKETING', 'CALL_CENTER', 'DISTRIBUTOR', 'SR', 'SHOPKEEPER'],
        default: 'SHOPKEEPER'
    },

    // 🚀 NEW: Added permissions array for dynamic UI routing
    permissions: {
        type: [String],
        default: []
    },

    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
        default: 'ACTIVE'
    },

    territory: {
        division: String, district: String, police_station: String,
        address_1: String, address_2: String,
        managed_divisions: [String], managed_districts: [String], managed_thanas: [String],
        manual_area: String
    }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;