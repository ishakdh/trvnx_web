const mongoose = require('mongoose');

const smsTransactionSchema = new mongoose.Schema({
    senderNumber: {
        type: String,
        required: true
    },
    trxId: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    gateway: {
        type: String,
        required: true // e.g., 'bKash' or 'Nagad'
    },
    status: {
        type: String,
        enum: ['WAITING', 'SUCCESS', 'REJECTED'],
        default: 'WAITING'
    },
    claimedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('SmsTransaction', smsTransactionSchema);