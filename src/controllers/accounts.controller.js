import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

// Option 01: TxID Verification Hub
export const processRecharge = async (req, res) => {
    const { txid, amount, method } = req.body;

    try {
        // 1. Duplicate Check: Block if TxID already exists
        const existingTx = await Transaction.findOne({ txid });
        if (existingTx) return res.status(400).json({ message: "Duplicate Transaction ID detected!" });

        // 2. Create Transaction
        const transaction = new Transaction({
            user_id: req.user._id,
            type: 'RECHARGE',
            amount,
            method,
            txid,
            status: 'SUCCESS' // In a real gateway, this would wait for API confirmation
        });

        // 3. Add Balance to Shopkeeper Account
        const user = await User.findById(req.user._id);
        user.current_balance += Number(amount);

        await transaction.save();
        await user.save();

        res.json({ message: "Balance added successfully", new_balance: user.current_balance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Option 03: Ready for Payout Queue
export const requestPayout = async (req, res) => {
    const { amount } = req.body;
    const user = req.user;

    // Threshold Checks
    const threshold = user.role === 'DISTRIBUTOR' ? 10000 : 5000;
    if (user.commission_wallet < amount || amount < threshold) {
        return res.status(400).json({ message: `Minimum payout is ${threshold} TK` });
    }

    // Lock the balance instantly
    user.commission_wallet -= amount;
    await user.save();

    const payoutRequest = new Transaction({
        user_id: user._id,
        type: 'PAYOUT',
        amount,
        status: 'LOCKED' // Prevent multiple requests
    });

    await payoutRequest.save();
    res.json({ message: "Payout request sent to Accounts. Balance locked." });
};