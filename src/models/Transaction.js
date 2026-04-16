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
            'DEPOSIT', 'WITHDRAWAL', 'EMI_PAYMENT', 'LICENSE_ACTIVATION',
            'COMMISSION', 'RECHARGE', 'MANUAL_INCOME', 'MANUAL_EXPENSE',
            'SR_COMMISSION', 'DISTRIBUTOR_EXPENSE', 'SR_PAYOUT',
            'PAYOUT_REQUEST', 'SR_PAYOUT_REQUEST' // 🚀 Added SR Request
        ]
    },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'COMPLETED', 'Waiting for approval', 'Waiting for release', 'Complete', 'PENDING_MFS', 'PENDING_ADMIN', 'PENDING_ACCOUNTS'],
        default: 'PENDING'
    },
    remarks: { type: String },

    shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: { type: String },
    transaction_id: { type: String },
    gateway_type: { type: String },
    payment_method: { type: String }

}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
export default Transaction;