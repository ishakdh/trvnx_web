import express from 'express';
import {
    getPendingTransactions,
    manualRecharge,
    approveDeposit,
    approvePayoutAdmin,
    releasePayout,
    requestDistributorPayout,
    getSrCommissions,
    requestSrPayout
} from '../controllers/transactionController.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 1. Fetch all pending transactions for the Finance Terminal
router.get('/pending', protect, authorize('read'), getPendingTransactions);

// 2. Process a manual recharge from the Admin Dashboard
router.post('/manual-recharge', protect, authorize('action'), manualRecharge);

// 3. Approve a pending shopkeeper deposit/recharge
router.post('/approve', protect, authorize('action'), approveDeposit);

// 🚀 THE FIX IS HERE: I have removed authorize('action') from request-payout.

router.post('/request-payout', protect, requestDistributorPayout);

router.post('/approve-payout', protect, authorize('action'), approvePayoutAdmin);
router.post('/release-payout', protect, authorize('action'), releasePayout);

router.get('/sr/commissions', protect, getSrCommissions);
router.post('/sr-request-payout', protect, requestSrPayout);

export default router;