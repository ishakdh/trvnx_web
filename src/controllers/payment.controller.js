import SmsTransaction from '../models/SmsTransaction.js';
import User from '../models/User.js';

// 1. Webhook for Android SMS App (Pushes data to server)
export const receiveSmsData = async (req, res) => {
    try {
        // 🕵️ ADDED THIS LINE: The Spy Line to catch the 403 error cause
        console.log("DEBUG: Incoming Request Body:", JSON.stringify(req.body));

        // Destructure all possible fields from the app
        const { senderNumber, sender, trxId, amount, gateway, message, messageBody, secret_key } = req.body;

        // 🛡️ SECURITY: Check master password before doing anything
        if (secret_key !== process.env.MASTER_PASSWORD) {
            console.error("❌ SMS WEBHOOK: Unauthorized Access Attempt");
            // If this fails, look at the DEBUG log above to see what the app actually sent
            return res.status(403).json({ success: false, message: 'UNAUTHORIZED' });
        }

        let finalTrxId = trxId;
        let finalAmount = amount;
        const actualMessage = messageBody || message;

        // 🔍 SMART PARSING: If the app sends a raw message, extract data using Regex
        if (actualMessage && (!finalTrxId || !finalAmount)) {
            console.log("📩 Parsing raw SMS text:", actualMessage);
            const trxMatch = actualMessage.match(/(?:TrxID|TXNID|Transaction ID)[:\s]*([A-Z0-9]+)/i);
            const amountMatch = actualMessage.match(/(?:Tk|Amount|Cash In)[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i);

            if (trxMatch) finalTrxId = trxMatch[1];
            if (amountMatch) finalAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
        }

        // Validate that we actually have the data
        if (!finalTrxId || !finalAmount) {
            console.error("⚠️ SMS WEBHOOK: Could not parse TrxID or Amount from message.");
            return res.status(400).json({ success: false, message: 'Invalid SMS Format' });
        }

        const newTransaction = new SmsTransaction({
            senderNumber: senderNumber || sender || 'Unknown',
            trxId: finalTrxId,
            amount: Number(finalAmount),
            gateway: gateway || 'bKash/Nagad',
            status: 'WAITING'
        });

        await newTransaction.save();
        console.log(`✅ SMS LOGGED: ID ${finalTrxId} for ${finalAmount} Tk`);
        res.status(200).json({ success: true, message: 'SMS logged. Waiting for user request.' });

    } catch (error) {
        if (error.code === 11000) {
            console.warn("⚠️ SMS WEBHOOK: Duplicate Transaction ID ignored.");
            return res.status(400).json({ success: false, message: 'Transaction ID already processed.' });
        }
        console.error("❌ SMS WEBHOOK 500 ERROR:", error.message);
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
                $inc: { current_balance: transaction.amount }
            });

            console.log(`💰 BALANCE UPDATED: ${transaction.amount} added to user ${userId}`);
            return res.status(200).json({
                success: true,
                message: 'Payment verified and balance updated automatically.',
                amountAdded: transaction.amount
            });
        }

    } catch (error) {
        console.error("❌ PAYMENT VERIFY ERROR:", error.message);
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