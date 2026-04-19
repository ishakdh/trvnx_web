import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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
        enum: ['PENDING', 'PENDING_ADMIN', 'SUCCESS', 'RELEASED', 'REJECTED']
    }, // 🚀 FIXED: Added the required comma here
    remarks: { type: String },

    shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String },
    transaction_id: { type: String },
    gateway_type: { type: String },
    payment_method: { type: String }

}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
export default Transaction;