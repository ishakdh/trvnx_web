import express from "express";
import { processRecharge, requestPayout } from "../controllers/accounts.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Shopkeepers can recharge
router.post("/recharge", protect, processRecharge);

// Distributors & SRs can request payout
router.post("/payout-request", protect, requestPayout);

// Accounts Panel only: View Payout Queue
router.get("/payout-queue", protect, authorize('read'), async (req, res) => {
    const queue = await Transaction.find({ type: 'PAYOUT', status: 'LOCKED' }).populate('user_id');
    res.json(queue);
});

export default router;