import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    // 🚀 CHANGED: Match the snake_case used in your controllers
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // 🚀 NEW: Track which admin performed the recharge
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    amount: { type: Number, required: true },
    type: {
        type: String,
        required: true,
        enum: [
            'MANUAL_INCOME',
            'RECHARGE',
            'MANUAL_EXPENSE',
            'COMMISSION',
            'SR_COMMISSION',
            'DISTRIBUTOR_EXPENSE',
            'LICENSE_ACTIVATION',
            'SR_PAYOUT',
            'SR_PAYOUT_REQUEST',
            'PAYOUT_REQUEST',
            'BONUS_EXPENSE',
            'BONUS'
        ]
    },
    status: {
        type: String,
        // 🚀 THE FIX: Added 'COMPLETED' and 'SUCCESS' to the allowed list
        enum: ['PENDING', 'PENDING_ADMIN', 'SUCCESS', 'RELEASED', 'REJECTED', 'COMPLETED'],
        default: 'SUCCESS'
    },
    remarks: { type: String },
    shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String },
    transaction_id: { type: String },
    gateway_type: { type: String },
    method: { type: String } // 🚀 CHANGED: Match 'method' from controller

}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
export default Transaction;