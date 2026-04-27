import SmsTransaction from '../models/SmsTransaction.js';
import User from '../models/User.js';

// 1. Webhook for Android SMS App (Pushes data to server)
export const receiveSmsData = async (req, res) => {
    try {
        const { senderNumber, trxId, amount, gateway } = req.body;

        const newTransaction = new SmsTransaction({
            senderNumber,
            trxId,
            amount: Number(amount),
            gateway,
            status: 'WAITING'
        });

        await newTransaction.save();
        res.status(200).json({ success: true, message: 'SMS logged. Waiting for user request.' });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Transaction ID already processed.' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. User Submits Transaction ID (Automated Verification)
export const verifyUserPayment = async (req, res) => {
    try {
        const { userId, trxId } = req.body;

        const transaction = await SmsTransaction.findOne({ trxId: trxId });

        if (!transaction) {
            return res.status(400).json({ success: false, message: 'Invalid Transaction ID.' });
        }

        if (transaction.status === 'SUCCESS') {
            return res.status(400).json({ success: false, message: 'This ID has already been used.' });
        }

        if (transaction.status === 'WAITING') {
            // Update the SMS log to SUCCESS
            transaction.status = 'SUCCESS';
            transaction.claimedBy = userId;
            await transaction.save();

            // 🚀 THE AUTOMATION: Update the Shopkeeper's actual balance
            await User.findByIdAndUpdate(userId, {
                $inc: { current_balance: transaction.amount } // ✅ Matches your Dashboard
            });

            return res.status(200).json({
                success: true,
                message: 'Payment verified and balance updated automatically.',
                amountAdded: transaction.amount
            });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. Admin Route for the Dashboard Table
export const getAllTransactions = async (req, res) => {
    try {
        const transactions = await SmsTransaction.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};