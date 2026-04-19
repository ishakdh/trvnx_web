import express from "express";
import { getPendingShops, approveShop, rejectShop, getAuditLogs, submitMfsTransaction, getDistributorCommissions, submitManualTransaction, getAccountingLedger, getUnusedBalance, manualShopRecharge, uploadQRCodes } from "../controllers/admin.controller.js";
// 🚀 ADDED rejectSrPayment to imports
import { approveShopkeeper, releaseSrPayment, rejectSrPayment } from "../controllers/transactionController.js";
import { protect } from "../middlewares/auth.middleware.js";

// 🚀 Make sure you adjust this path to wherever your multer upload middleware is located!
import upload from '../middlewares/uploadMiddleware.js';

// 🚀 FIXED: Exact path and filename based on your folder structure
import { mirrorUser } from "../middlewares/auth.controller.js";
import { payBonus } from '../controllers/admin.controller.js';

const router = express.Router();

console.log("🚨 ADMIN ROUTES FILE IS OFFICIALLY LOADED! 🚨");

const checkRole = (req, res, next) => {
    if (req.user && ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'DISTRIBUTOR', 'SR'].includes(req.user.role)) {
        next();
    } else {
        return res.status(401).json({ message: "Security Block: Unauthorized Role" });
    }
};

router.get("/audit-logs", protect, checkRole, getAuditLogs);
router.get("/pending-kyc", protect, checkRole, getPendingShops);
router.put("/approve/:shopId", protect, checkRole, approveShop);
router.put("/reject/:shopId", protect, checkRole, rejectShop);
router.post("/submit-mfs", protect, checkRole, submitMfsTransaction);
router.get("/commissions", protect, checkRole, getDistributorCommissions);
router.post("/finance-entry", protect, checkRole, submitManualTransaction);
router.get("/finance-ledger", protect, checkRole, getAccountingLedger);
router.get("/unused-balance", protect, checkRole, getUnusedBalance);
router.post("/shop-recharge", manualShopRecharge);
router.post('/pay-bonus', protect, payBonus);

// DISTRIBUTOR & SR MANAGEMENT ROUTES
router.post("/approve-shopkeeper", protect, checkRole, approveShopkeeper);
router.post("/release-sr-payment", protect, checkRole, releaseSrPayment);

// 🚀 NEW ROUTE TO REJECT SR PAYMENT AND TRIGGER REFUND
router.post("/reject-sr-payment", protect, checkRole, rejectSrPayment);

// 🚀 NEW ROUTE FOR MIRROR PROTOCOL
router.post("/mirror-user", protect, checkRole, mirrorUser);

// 🚀 NEW ROUTE FOR QR CODE UPLOADS (using multer)
router.post("/upload-qr", protect, checkRole, upload.fields([{ name: 'qr1', maxCount: 1 }, { name: 'qr2', maxCount: 1 }]), uploadQRCodes);

export default router;