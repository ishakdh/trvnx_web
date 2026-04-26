import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import Transaction from "../models/Transaction.js";
import Target from "../models/Target.js";
import Settings from "../models/Settings.js";
import { logActivity } from '../utils/logger.js';

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
                // SR Earning -> Now explicitly labeled as SR_COMMISSION
                await User.findByIdAndUpdate(sr._id, { $inc: { balance: srCut, commission_earned: srCut } });
                await new Transaction({
                    userId: sr._id, shop_id: shopkeeper._id, amount: srCut,
                    type: 'SR_COMMISSION', status: 'SUCCESS',
                    description: `${type} SR Commission (Income from Distributor)`
                }).save();
                console.log(`💰 PAID: SR received ৳${srCut}`);

                // Distributor Expense -> Now explicitly labeled as DISTRIBUTOR_EXPENSE
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

export const getAuditLogs = async (req, res) => {
    try {
        // 🚀 FIXED: Increased limit to 2000 so nothing gets skipped or hidden on the frontend
        const logs = await ActivityLog.find()
            .populate('performed_by', 'name role')
            .populate('target_id', 'customer_name _id') // 🚀 ADDED THIS NEW LINE HERE
            .sort({ createdAt: -1 })
            .limit(2000);

        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getPendingShops = async (req, res) => {
    try {
        const pending = await User.find({ role: 'SHOPKEEPER', kyc_status: { $in: ['TRIAL', 'PENDING'] } }).populate('parent_id', 'name phone');
        res.json(pending);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const approveShop = async (req, res) => {
    try {
        const shop = await User.findById(req.params.shopId);
        if (!shop) return res.status(404).json({ message: "Shop not found" });
        shop.kyc_status = 'ACTIVE';
        await shop.save();

        // 🚀 TRIGGER ACTIVITY LOG (FIXED UNDEFINED VARIABLE CRASH)
        await logActivity(
            req.user,
            `SHOP_APPROVAL`,
            shop._id,
            `${req.user?.role || 'Admin'} approved Shop: ${shop.name}`
        );

        res.status(200).json({ success: true, message: `Shop APPROVED successfully` });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const rejectShop = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.shopId, { kyc_status: 'BANNED' });
        res.json({ message: "Shop rejected and banned." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const submitMfsTransaction = async (req, res) => {
    try {
        const { transactionId, amount, gateway, shopkeeperId } = req.body;
        const newTx = new Transaction({ userId: shopkeeperId, amount: amount, transaction_id: transactionId, gateway_type: gateway.type, type: 'RECHARGE', status: 'PENDING_MFS' });
        await newTx.save();
        res.status(200).json({ message: "Transaction logged." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getDistributorCommissions = async (req, res) => {
    try {
        const commissions = await Transaction.find({ type: 'COMMISSION' }).populate('userId', 'name business_name phone').populate('shop_id', 'name business_name').sort({ createdAt: -1 });
        const groupedData = {};
        commissions.forEach(comm => {
            if (!comm.userId) return;
            const distId = comm.userId._id.toString();
            if (!groupedData[distId]) { groupedData[distId] = { _id: comm._id, distributor_id: comm.userId, amount: 0, status: comm.status || 'Waiting for approval', date: comm.createdAt, details: [] }; }
            groupedData[distId].amount += comm.amount;
            groupedData[distId].details.push({ date: comm.createdAt, shop_id: comm.shop_id ? comm.shop_id._id.toString().slice(-6).toUpperCase() : 'N/A', shop_name: comm.shop_id ? (comm.shop_id.business_name || comm.shop_id.name) : 'N/A', description: comm.description || 'Commission', amount: comm.amount });
        });
        res.status(200).json(Object.values(groupedData));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const submitManualTransaction = async (req, res) => {
    try {
        const { type, name, description, amount, remarks, date } = req.body;
        const newTx = new Transaction({ userId: req.user._id, amount: Number(amount), type: type, description: name + (description ? ` - ${description}` : ''), remarks, status: 'COMPLETED', createdAt: date ? new Date(date) : new Date() });
        await newTx.save();

        // 🚀 TRIGGER ACTIVITY LOG
        await logActivity(
            req.user,
            'SALE_GENERATE',
            newTx._id,
            `Generated Manual Entry: ${type} - ৳${amount}`
        );

        res.status(201).json({ message: "Generated." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getAccountingLedger = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { type: { $in: ['MANUAL_INCOME', 'RECHARGE', 'MANUAL_EXPENSE', 'COMMISSION', 'SR_COMMISSION', 'DISTRIBUTOR_EXPENSE', 'LICENSE_ACTIVATION', 'SR_PAYOUT', 'PAYOUT_REQUEST', 'BONUS_EXPENSE'] } }; // 🚀 Added BONUS_EXPENSE here so it loads in the ledger

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        const ledger = await Transaction.find(query).populate('userId', 'name business_name role').sort({ createdAt: -1 });
        res.status(200).json(ledger);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getUnusedBalance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { type: { $in: ['RECHARGE', 'LICENSE_ACTIVATION', 'BONUS'] } }; // 🚀 Added BONUS so shop unused balance matches

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        const transactions = await Transaction.find(query).populate('userId', 'name business_name phone role').sort({ createdAt: -1 });
        const shopData = {};
        transactions.forEach(tx => {
            if (!tx.userId || tx.userId.role !== 'SHOPKEEPER') return;
            const shopId = tx.userId._id.toString();
            if (!shopData[shopId]) { shopData[shopId] = { shop_id: tx.userId._id, shop_name: tx.userId.business_name || 'N/A', shop_owner: tx.userId.name, phone: tx.userId.phone, current_balance: 0, history: [] }; }
            if (tx.type === 'RECHARGE' || tx.type === 'BONUS') shopData[shopId].current_balance += tx.amount; // 🚀 Calculate Bonus
            if (tx.type === 'LICENSE_ACTIVATION') shopData[shopId].current_balance -= tx.amount;
            shopData[shopId].history.push({ date: tx.createdAt, type: tx.type, amount: tx.amount, description: tx.description || 'Entry' });
        });
        res.status(200).json(Object.values(shopData));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const manualShopRecharge = async (req, res) => {
    try {
        const { shopId, amount, paymentMethod, otherDetails, date } = req.body;
        const targetShop = await User.findById(shopId);
        if (!targetShop) return res.status(404).json({ message: "Shop Not Found" });
        const finalMethod = paymentMethod === 'Other' ? `Other - ${otherDetails}` : paymentMethod;

        const newTx = new Transaction({
            userId: shopId,
            amount: Number(amount),
            type: 'RECHARGE',
            status: 'COMPLETED',
            payment_method: finalMethod,
            description: `Manual Recharge (${finalMethod})`,
            createdAt: date ? new Date(date) : new Date()
        });
        await newTx.save();

        targetShop.balance += Number(amount);
        await targetShop.save();

        if (Number(amount) >= 1000) {
            await calculateHierarchyCommissions(targetShop, 'ID_GEN');
            await updateMarketingTargets(targetShop._id, Number(amount));
        }

        res.status(200).json({ message: "Recharged", shop: targetShop, transaction: newTx });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 🚀 NEW: UPLOAD QR CODES LOGIC
export const uploadQRCodes = async (req, res) => {
    try {
        let updateData = {};

        if (req.files && req.files['qr1']) {
            updateData.qr1_image_url = req.files['qr1'][0].path;
        }
        if (req.files && req.files['qr2']) {
            updateData.qr2_image_url = req.files['qr2'][0].path;
        }

        if (Object.keys(updateData).length > 0) {
            await Settings.findOneAndUpdate(
                { config_name: "GLOBAL_CONFIG" },
                updateData,
                { new: true, upsert: true }
            );
        }
        res.status(200).json({ success: true, message: "QR Codes updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🚀 NEW: Promotional Bonus Logic (Company Expense vs Shop Income)
export const payBonus = async (req, res) => {
    try {
        const { targetId, targetRole, amount, reason, date } = req.body;
        const bonusAmount = Number(amount);

        if (!targetId || !bonusAmount || bonusAmount <= 0) {
            return res.status(400).json({ message: "Invalid payload or amount." });
        }

        // 1. Find the target identity in the database
        const targetUser = await User.findById(targetId);
        if (!targetUser) return res.status(404).json({ message: "Recipient not found." });

        // 2. LOGIC FOR SHOPKEEPER (Affects Company Balance Sheet)
        if (targetRole === 'SHOPKEEPER') {

            // 🚀 FIXED: Using $inc bypasses strict schema validation errors on old user accounts!
            await User.findByIdAndUpdate(targetId, { $inc: { balance: bonusAmount } });

            // Create a formal Ledger Entry so it hits the Balance Sheet/Cashbook as an EXPENSE
            const ledgerEntry = new Transaction({
                type: 'BONUS_EXPENSE',
                userId: targetId,
                amount: bonusAmount,
                description: reason || 'Shop Promotional Bonus',
                status: 'COMPLETED',
                createdAt: date ? new Date(date) : new Date()
            });
            await ledgerEntry.save();

            // Also create an Income entry for the Shop's personal unused balance ledger
            const shopIncomeEntry = new Transaction({
                type: 'BONUS',
                userId: targetId,
                amount: bonusAmount,
                description: reason || 'Promotional Bonus Received',
                status: 'COMPLETED',
                createdAt: date ? new Date(date) : new Date()
            });
            await shopIncomeEntry.save();

            // Trigger Activity Log
            if (req.user) {
                await logActivity(
                    req.user,
                    'BONUS_DEPLOYED',
                    ledgerEntry._id,
                    `Deployed ৳${bonusAmount} Bonus to Shop: ${targetUser.name || 'Unknown'}`
                );
            }

            // 3. LOGIC FOR DISTRIBUTOR / SR (Hidden from Main Company Ledger)
        } else if (['DISTRIBUTOR', 'SR'].includes(targetRole)) {

            // 🚀 FIXED: Bulletproof check to ensure it logs as COMMISSION
            const incomeType = String(targetRole).toUpperCase() === 'DISTRIBUTOR' ? 'COMMISSION' : 'SR_COMMISSION';

            await User.findByIdAndUpdate(targetId, {
                $inc: { balance: bonusAmount, commission_earned: bonusAmount }
            });

            const personalEntry = new Transaction({
                type: incomeType,
                userId: targetId,
                amount: bonusAmount,
                description: reason || 'Target Achievement Bonus',
                status: 'SUCCESS',
                createdAt: date ? new Date(date) : new Date()
            });
            await personalEntry.save();

            // Trigger Activity Log
            if (req.user) {
                await logActivity(
                    req.user,
                    'BONUS_DEPLOYED',
                    personalEntry._id,
                    `Deployed ৳${bonusAmount} Bonus to ${targetRole}: ${targetUser.name || 'Unknown'}`
                );
            }

        } else {
            return res.status(400).json({ message: "Invalid role for bonus." });
        }

        res.status(200).json({ message: "BONUS_DEPLOYED" });

    } catch (error) {
        console.error("Bonus Error:", error);
        res.status(500).json({ message: "Failed to deploy bonus", error: error.message });
    }
};
// deployment-fix-v2