import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import SmsLog from '../models/SmsLog.js';
import Target from '../models/Target.js';
import LicenseFee from '../models/LicenseFee.js';
import {logActivity} from "../utils/logger.js";

// 🚀 BULLETPROOF COMMISSION ENGINE
async function calculateHierarchyCommissions(shopkeeper, type) {
    console.log(`\n--- 🚀 TRIGGERING COMMISSION ENGINE FOR: ${shopkeeper.business_name || shopkeeper.name} ---`);
    try {
        if (type === 'ID_GEN') {
            const alreadyPaid = await Transaction.findOne({ shop_id: shopkeeper._id, description: /ID_GEN/ });
            if (alreadyPaid) {
                console.log(`❌ ABORT: ID_GEN Commission already paid for this shop.`);
                return;
            }
        }

        const parentId = shopkeeper.parent_id || shopkeeper.createdBy;
        if (!parentId) {
            console.log(`❌ CRITICAL ABORT: This shop has NO parent_id. It is orphaned!`);
            return;
        }

        const sr = await User.findById(parentId);
        if (!sr) {
            console.log(`❌ ABORT: Parent ID not found in database.`);
            return;
        }

        const distributor = await User.findById(sr.parent_id || sr.createdBy);

        // 1. ADMIN TO DISTRIBUTOR
        const activeDist = distributor || (sr.role === 'DISTRIBUTOR' ? sr : null);
        if (activeDist) {
            console.log(`✅ Chain Found -> Distributor: ${activeDist.name}`);
            const distCut = type === 'ID_GEN' ? (activeDist.commissions?.per_user || 500) : (activeDist.commissions?.per_license || 100);

            if (distCut > 0) {
                await User.findByIdAndUpdate(activeDist._id, { $inc: { balance: distCut, commission_earned: distCut } });
                await new Transaction({
                    userId: activeDist._id, shop_id: shopkeeper._id, amount: distCut,
                    type: 'COMMISSION', status: 'SUCCESS',
                    description: `${type} Commission (Income from Admin)`
                }).save();
                console.log(`💰 PAID: Distributor received ৳${distCut}`);
            }
        }

        // 2. DISTRIBUTOR TO SR
        if (sr.role === 'SR') {
            console.log(`✅ Chain Found -> SR: ${sr.name}`);
            const srCut = type === 'ID_GEN' ? (sr.commissions?.per_user || 200) : (sr.commissions?.per_license || 50);

            if (srCut > 0) {
                await User.findByIdAndUpdate(sr._id, { $inc: { balance: srCut, commission_earned: srCut } });
                await new Transaction({
                    userId: sr._id, shop_id: shopkeeper._id, amount: srCut,
                    type: 'SR_COMMISSION', status: 'SUCCESS',
                    description: `${type} SR Commission (Income from Distributor)`
                }).save();
                console.log(`💰 PAID: SR received ৳${srCut}`);

                if (activeDist) {
                    await User.findByIdAndUpdate(activeDist._id, { $inc: { balance: -srCut } });
                    await new Transaction({
                        userId: activeDist._id, shop_id: shopkeeper._id, amount: srCut,
                        type: 'DISTRIBUTOR_EXPENSE', status: 'SUCCESS',
                        description: `SR Comm Paid (Expense)`
                    }).save();
                    console.log(`📉 DEDUCTED: ৳${srCut} taken from Distributor for SR.`);
                }
            }
        }
        console.log(`--- ✅ ENGINE COMPLETE ---\n`);
    } catch (err) { console.error("Commission Error:", err); }
}

const updateMarketingTargets = async (userId, amount) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        let distId = null;
        let srId = null;

        if (user.role === 'SR') {
            srId = user._id;
            distId = user.parent_id;
        } else if (user.role === 'DISTRIBUTOR') {
            distId = user._id;
        } else if (user.role === 'SHOPKEEPER') {
            const parent = await User.findById(user.parent_id);
            if (parent) {
                if (parent.role === 'SR') {
                    srId = parent._id;
                    distId = parent.parent_id;
                } else if (parent.role === 'DISTRIBUTOR') {
                    distId = parent._id;
                }
            }
        }

        const now = new Date();
        const queries = [];

        if (distId) queries.push({ target_level: 'DISTRIBUTOR', status: 'ACTIVE', start_date: { $lte: now }, end_date: { $gte: now }, $or: [{ created_by: distId }, { distributor_id: distId }, { target_markets: `DIST: ${user.name}` }] });
        if (srId) queries.push({ target_level: 'SR', status: 'ACTIVE', start_date: { $lte: now }, end_date: { $gte: now }, $or: [{ created_by: srId }, { sr_id: srId }, { target_markets: `SR: ${user.name}` }] });

        if (queries.length > 0) {
            const activeTargets = await Target.find({ $or: queries });
            for (let target of activeTargets) {
                target.sales_amount += amount;
                await target.save();
            }
        }
    } catch (err) {
        console.error("Marketing Target Update Failed:", err);
    }
};

export const createDeposit = async (req, res) => {
    try {
        const { userId, amount, method, txid } = req.body;
        const numAmount = Number(amount);

        const config = await Settings.findOne({ config_name: "GLOBAL_CONFIG" });
        if (!config) return res.status(500).json({ message: "System settings not initialized." });

        if (txid) {
            const alreadyUsed = await Transaction.findOne({ txid, status: 'SUCCESS' });
            if (alreadyUsed) return res.status(403).json({ success: false, message: "TrxID already claimed." });
        }

        if (method === 'CASH') {
            if (!config.allow_cash) return res.status(403).json({ message: "Cash disabled." });
            await new Transaction({ userId, amount: numAmount, method: 'CASH', type: 'RECHARGE', status: 'PENDING' }).save();
            return res.status(201).json({ success: true, message: "Cash logged. Awaiting Admin." });
        }

        if (['BKASH', 'NAGAD', 'PERSONAL'].includes(method)) {
            if (!config.allow_personal_sms) return res.status(403).json({ message: "Mobile deposits disabled." });

            const match = await SmsLog.findOne({ txid, is_claimed: false });

            if (match && match.amount === numAmount) {
                match.is_claimed = true;
                await match.save();

                const shop = await User.findById(userId);
                shop.balance += numAmount;
                shop.status = 'ACTIVE';
                shop.custom_license_fee = config.base_license_price;
                await shop.save();

                await new Transaction({
                    userId, amount: numAmount, method, txid, type: 'RECHARGE', status: 'SUCCESS', remarks: "Auto-matched via SMS"
                }).save();

                if (numAmount >= 1000) {
                    await calculateHierarchyCommissions(shop, 'ID_GEN');
                    await updateMarketingTargets(shop._id, numAmount);
                }

                return res.status(200).json({ success: true, message: "INSTANT_MATCH: Balance added." });
            } else {
                await new Transaction({
                    userId, amount: numAmount, method, txid, type: 'RECHARGE', status: 'PENDING', remarks: "Awaiting SMS verification."
                }).save();
                return res.status(201).json({ success: true, message: "TrxID pending verification." });
            }
        }
    } catch (error) {
        res.status(500).json({ message: "Deposit Failed", error: error.message });
    }
};

export const approveDeposit = async (req, res) => {
    try {
        const { transactionId, customLicenseFee } = req.body;
        const tx = await Transaction.findById(transactionId);
        if (!tx) return res.status(404).json({ message: "Transaction not found" });

        const config = await Settings.findOne({ config_name: "GLOBAL_CONFIG" });
        const shop = await User.findById(tx.userId);

        shop.balance += tx.amount;
        shop.status = 'ACTIVE';
        shop.custom_license_fee = customLicenseFee ? Number(customLicenseFee) : config.base_license_price;

        await shop.save();
        if (tx.amount >= 1000) {
            await calculateHierarchyCommissions(shop, 'ID_GEN');
            await updateMarketingTargets(shop._id, tx.amount);
        }

        tx.status = 'SUCCESS';
        await tx.save();
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).send(error.message); }
};

export const manualRecharge = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.balance += Number(amount);
        user.status = 'ACTIVE';
        await user.save();

        await new Transaction({
            userId: userId, amount, type: 'RECHARGE', method: 'CASH',
            status: 'SUCCESS', remarks: "MASTER_ADMIN_CREDIT"
        }).save();

        if (Number(amount) >= 1000) {
            await calculateHierarchyCommissions(user, 'ID_GEN');
        }

        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 🚀 RELEASE PAYOUT (ADMIN PAYING DISTRIBUTOR)
export const releasePayout = async (req, res) => {
    try {
        const { transactionId, txId } = req.body; // 🚀 FIXED: Added txId
        const tx = await Transaction.findById(transactionId).populate('userId');

        if (tx.userId.balance < tx.amount) return res.status(400).json({ message: "Low Balance" });

        await User.findByIdAndUpdate(tx.userId._id, { $inc: { balance: -tx.amount } });
        tx.status = 'SUCCESS';
        const slipId = `TRVNX-PAY-${tx._id.toString().slice(-5).toUpperCase()}`;
        tx.remarks = `Released by Admin. Bank TxID: ${txId || slipId}`; // 🚀 FIXED: Captures TxID
        await tx.save();
        // 🚀 TRIGGER ACTIVITY LOG
        await logActivity(
            req.user,
            'PAYOUT_APPROVE',
            tx.userId?._id,
            `Released Funds to Distributor. Amount: ৳${tx.amount} | TxID: ${txId}`
        );

        res.status(200).json({
            success: true,
            slip: { id: txId || slipId, payee: tx.userId.name, phone: tx.userId.phone, amount: tx.amount, date: tx.updatedAt }
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const activateLicense = async (req, res) => {
    try {
        const { licenseKey, shopPhone, imei } = req.body;

        const shop = await User.findOne({ phone: shopPhone });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const districtKey = `DISTRICT: ${shop.address?.district}`;
        const thanaKey = `THANA: ${shop.address?.thana}`;

        const matrixFee = await LicenseFee.findOne({
            status: 'LIVE',
            target_markets: { $in: [districtKey, thanaKey] }
        }).sort({ createdAt: -1 });

        const config = await Settings.findOne({ config_name: "GLOBAL_CONFIG" });
        const fee = matrixFee ? matrixFee.fee_amount : (config?.base_license_price || 2000);

        if (shop.balance < fee) {
            return res.status(400).json({
                success: false,
                message: `Insufficient Balance. You need ৳${fee} to activate this device.`
            });
        }

        shop.balance -= fee;
        await shop.save();

        await calculateHierarchyCommissions(shop, 'LICENSE');
        await updateMarketingTargets(shop._id, fee);

        await new Transaction({
            userId: shop._id,
            amount: fee,
            type: 'LICENSE_ACTIVATION',
            status: 'SUCCESS',
            remarks: `Device IMEI: ${imei || 'N/A'} | Key: ${licenseKey}`
        }).save();

        res.status(200).json({ success: true, message: "Device Licensed & Fee Deducted." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🚀 SMART PENDING ROUTER (Upgraded with Mirror Mode Support)
export const getPendingTransactions = async (req, res) => {
    try {
        // Check if frontend is passing targetUserId in the URL (e.g., ?targetUserId=123)
        const isMirroring = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role) && req.query.targetUserId;
        const targetUserId = isMirroring ? req.query.targetUserId : (req.user._id || req.user.id);

        let activeRole = req.user.role;

        // If mirroring, look up the real role of the person we are mirroring
        if (isMirroring) {
            const targetUser = await User.findById(targetUserId);
            if (targetUser) activeRole = targetUser.role;
        }

        if (['SUPER_ADMIN', 'ADMIN'].includes(activeRole)) {
            // 👑 ADMIN VIEW
            const pendingAdmin = await Transaction.find({ status: 'PENDING_ADMIN' })
                .populate('userId', 'name phone balance')
                .sort({ createdAt: -1 });

            return res.status(200).json(pendingAdmin);

        } else if (activeRole === 'DISTRIBUTOR') {
            // 📦 DISTRIBUTOR VIEW
            const mySrs = await User.find({
                $or: [{ parent_id: targetUserId }, { createdBy: targetUserId }]
            }).select('_id');

            const srIds = mySrs.map(sr => sr._id);

            const pendingDist = await Transaction.find({
                status: 'PENDING',
                type: 'SR_PAYOUT_REQUEST',
                userId: { $in: srIds }
            }).populate('userId', 'name phone balance')
                .sort({ createdAt: -1 });

            return res.status(200).json(pendingDist);
        }

        res.status(200).json([]);
    } catch (error) {
        res.status(500).json({ message: "Fetch failed" });
    }
};

export const getSettings = async (req, res) => {
    try {
        const settings = await Settings.findOne({ config_name: "GLOBAL_CONFIG" });
        res.status(200).json(settings);
    } catch (error) { res.status(500).json({ message: "Settings error" }); }
};

export const updateSettings = async (req, res) => {
    try {
        const updated = await Settings.findOneAndUpdate({ config_name: "GLOBAL_CONFIG" }, req.body, { new: true, upsert: true });
        res.status(200).json(updated);
    } catch (error) { res.status(500).json({ message: "Update failed" }); }
};

export const syncIncomingSms = async (req, res) => {
    try {
        // 1. Accept the RAW SMS text from the Android App
        const { sender, messageBody, secret_key } = req.body;

        const config = await Settings.findOne({ config_name: "GLOBAL_CONFIG" });
        if (!config || secret_key !== config.sms_bridge_secret) return res.status(403).json({ error: "UNAUTHORIZED" });

        // 2. Ignore spam or personal texts; only process MFS
        if (!sender.toLowerCase().includes('bkash') && !sender.toLowerCase().includes('nagad')) {
            return res.status(200).json({ message: "Ignored: Not MFS" });
        }

        // 3. THE SMART SERVER: Extract TxID and Amount using Regex
        const trxIdMatch = messageBody.match(/TrxID[:\s]*([A-Z0-9]+)/i);
        const amountMatch = messageBody.match(/Tk[:\s]*([\d,.]+)/i);

        if (!trxIdMatch || !amountMatch) {
            return res.status(200).json({ message: "Ignored: Could not find TxID or Amount" });
        }

        const txid = trxIdMatch[1].toUpperCase();
        const amount = Number(amountMatch[1].replace(/,/g, ''));

        // 4. Save to your existing SMS Log
        const newSms = await new SmsLog({ txid, amount, is_claimed: false }).save();
        console.log(`📥 NEW SMS LOGGED -> TxID: ${txid} | Amount: ৳${amount}`);

        // 5. THE MAGIC FIX: Check if a user ALREADY submitted this TxID as PENDING
        const pendingTx = await Transaction.findOne({ txid, status: { $in: ['PENDING', 'PENDING_ADMIN'] } });

        if (pendingTx && pendingTx.amount === amount) {

            // Mark SMS as claimed
            newSms.is_claimed = true;
            await newSms.save();

            // Add money to the shopkeeper's balance
            const shop = await User.findById(pendingTx.userId);
            if (shop) {
                shop.balance += amount;
                shop.status = 'ACTIVE';
                await shop.save();

                // Auto-Approve the Transaction
                pendingTx.status = 'SUCCESS';
                pendingTx.remarks = "Auto-matched via Background SMS App";
                await pendingTx.save();

                // Trigger Commission Engine if necessary
                if (amount >= 1000) {
                    await calculateHierarchyCommissions(shop, 'ID_GEN');
                    await updateMarketingTargets(shop._id, amount);
                }

                console.log(`🚀 INSTANT AUTO-APPROVE: ${txid} matched successfully!`);
            }
        }

        res.status(200).json({ success: true, txid, amount });
    } catch (error) {
        console.error("SMS Sync Error:", error);
        // Change from 500 to 200 so the Android app doesn't crash on duplicate TxIDs
        res.status(200).json({ error: "DUPLICATE_OR_SYNC_FAILED" });
    }
};

// 🚀 SR COMMISSIONS ROUTER (Upgraded with Mirror Mode Support)
export const getSrCommissions = async (req, res) => {
    try {
        const isMirroring = ['SUPER_ADMIN', 'ADMIN', 'DISTRIBUTOR'].includes(req.user.role) && req.query.targetUserId;
        const targetUserId = isMirroring ? req.query.targetUserId : (req.user._id || req.user.id);

        let query = {
            type: { $in: ['COMMISSION', 'SR_COMMISSION', 'SR_PAYOUT_REQUEST', 'SR_PAYOUT'] }
        };

        let isTargetSR = req.user.role === 'SR';

        if (isMirroring) {
            const target = await User.findById(targetUserId);
            if (target && target.role === 'SR') isTargetSR = true;
        }

        // Strictly fetch only for this specific SR
        if (isTargetSR) {
            query.userId = targetUserId;
        }

        const comms = await Transaction.find(query)
            .populate('userId', 'name phone')
            .populate('shop_id', 'name business_name')
            .sort({ createdAt: -1 });

        res.status(200).json(comms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🚀 SR PAYOUT REQUEST
export const requestSrPayout = async (req, res) => {
    try {
        const requesterRole = req.user.role;
        // MIRROR FIX: If Admin/Distributor is mirroring an SR, use targetUserId from body
        const srId = (['SUPER_ADMIN', 'ADMIN', 'DISTRIBUTOR'].includes(requesterRole) && req.body.targetUserId)
            ? req.body.targetUserId
            : (req.user._id || req.user.id);

        const { amount } = req.body;
        const requestAmount = Number(amount);

        const sr = await User.findById(srId);
        if (!sr || sr.balance < requestAmount || requestAmount <= 0) {
            return res.status(400).json({ message: "Invalid amount or insufficient balance." });
        }

        // Deduct immediately so SR cannot double-spend
        sr.balance -= requestAmount;
        await sr.save();

        await new Transaction({
            userId: srId,
            amount: requestAmount,
            type: 'SR_PAYOUT_REQUEST',
            status: 'PENDING',
            remarks: `Payout requested ${requesterRole !== 'SR' ? '(Via Admin/Distributor Mirror)' : ''}`
        }).save();

        await logActivity(req.user, 'PAYOUT_REQUEST', srId, `Payout requested for amount ৳${requestAmount}`);

        res.status(200).json({ success: true, message: "Request sent and balance deducted." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 🚀 SR PAYOUT RELEASE (DISTRIBUTOR PAYING SR)
export const releaseSrPayment = async (req, res) => {
    try {
        const { srId, amount, requestId, accountNumber, txId } = req.body;
        const distributorId = req.user?._id || req.user?.id;

        const distributor = await User.findById(distributorId);
        const sr = await User.findById(srId);

        if (!distributor || !sr) return res.status(404).json({ message: "Users not found" });

        await new Transaction({
            userId: srId, amount: amount, type: 'SR_PAYOUT', status: 'SUCCESS',
            remarks: `Payout by ${distributor.name} | A/C: ${accountNumber} | Bank TxID: ${txId}`
        }).save();

        if (requestId) {
            await Transaction.findByIdAndUpdate(requestId, {
                status: 'RELEASED',
                remarks: `Approved with Bank TxID: ${txId}`
            });
        }

        // 🚀 TRIGGER ACTIVITY LOG
        await logActivity(
            req.user,
            'PAYOUT_RELEASE',
            srId,
            `Released SR Payout. Amount: ৳${amount} | Bank TxID: ${txId}`
        );

        // 🚀 YOU MUST KEEP THIS SO THE FRONTEND KNOWS IT WORKED
        res.status(200).json({ success: true, message: "SR Payment Released", slip: { id: txId } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// 🚀 REJECT SR PAYOUT (REFUNDS SR WALLET)
export const rejectSrPayment = async (req, res) => {
    try {
        const { requestId, reason } = req.body; // 🚀 FIXED: Added reason
        const request = await Transaction.findById(requestId);

        if (!request || request.status !== 'PENDING') {
            return res.status(400).json({ message: "Invalid or already processed request." });
        }

        // Revert the amount back to the SR's wallet
        const sr = await User.findById(request.userId);
        if (sr) {
            sr.balance += request.amount;
            await sr.save();
        }

        request.status = 'REJECTED';
        request.remarks = `Rejected: ${reason || 'No reason provided'}`; // 🚀 FIXED: Stores rejection reason
        await request.save();

        res.status(200).json({ success: true, message: "Payout rejected and funds refunded to SR." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 🚀 SMART PAYOUT ROUTER (Handles both SR and Distributor Payouts intelligently)
export const requestDistributorPayout = async (req, res) => {
    try {
        const requesterRole = req.user.role;

        // 🚀 MIRROR FIX: Check target user if Admin/Distributor is mirroring
        const userId = (['SUPER_ADMIN', 'ADMIN', 'DISTRIBUTOR'].includes(requesterRole) && req.body.targetUserId)
            ? req.body.targetUserId
            : req.user?._id;

        const { amount } = req.body;
        const requestAmount = Number(amount);

        // Find the actual user whose wallet is being drained (could be SR or DISTRIBUTOR)
        const targetUser = await User.findById(userId);

        if (!targetUser) return res.status(404).json({ message: "User not found." });

        if (targetUser.balance < requestAmount || requestAmount <= 0) {
            return res.status(400).json({ message: "Invalid amount or low balance." });
        }

        targetUser.balance -= requestAmount;
        await targetUser.save();

        // 🚀 SMART ROUTING LOGIC:
        // If the user is an SR, route to Distributor. Otherwise, route to Admin.
        const isSR = targetUser.role === 'SR';

        await new Transaction({
            userId: userId,
            amount: requestAmount,
            type: isSR ? 'SR_PAYOUT_REQUEST' : 'PAYOUT_REQUEST',
            status: isSR ? 'PENDING' : 'PENDING_ADMIN',
            remarks: `Payout requested ${requesterRole !== targetUser.role ? '(Via Mirror Mode)' : ''}`
        }).save();

        await logActivity(req.user, 'PAYOUT_REQUEST', userId, `Payout requested: ৳${requestAmount}`);

        res.status(200).json({ success: true, message: "Request sent and balance deducted." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const approvePayoutAdmin = async (req, res) => {
    try {
        const { transactionId } = req.body;
        const tx = await Transaction.findById(transactionId);
        if (!tx) return res.status(400).json({ message: "Invalid state." });

        tx.status = 'SUCCESS';
        await tx.save();
        res.status(200).json({ success: true, message: "Sent to Accounts." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
// 🚀 REJECT DISTRIBUTOR PAYOUT (ADMIN ACTION)
export const rejectPayoutAdmin = async (req, res) => {
    try {
        // Log exactly what the frontend is sending
        console.log("Reject Payload received:", req.body);

        // Try to grab the ID from any possible name the frontend might be using
        const targetId = req.body.transactionId || req.body.requestId || req.body.id || req.body._id;

        if (!targetId) {
            return res.status(400).json({ message: "No valid ID provided in the request payload." });
        }

        const request = await Transaction.findById(targetId);

        if (!request) {
            return res.status(404).json({ message: "Transaction not found in database." });
        }

        if (!['PENDING', 'PENDING_ADMIN'].includes(request.status)) {
            return res.status(400).json({ message: "Invalid or already processed request." });
        }

        // Revert the amount back to the Distributor's (or SR's) wallet
        const userWallet = await User.findById(request.userId);
        if (userWallet) {
            userWallet.balance += request.amount;
            await userWallet.save();
        }

        request.status = 'REJECTED';
        request.remarks = `Rejected by Admin: ${req.body.reason || 'No reason provided'}`;
        await request.save();

        res.status(200).json({ success: true, message: "Payout rejected and funds refunded." });
    } catch (error) {
        console.error("Reject Admin Error:", error);
        res.status(500).json({ error: error.message });
    }
};