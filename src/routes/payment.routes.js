import express from 'express';
const router = express.Router();
// We will create this controller in Step 2
import * as paymentController from '../controllers/payment.controller.js';

// 1. Webhook for the Android SMS App to push new SMS data
router.post('/webhook/sms', paymentController.receiveSmsData);

// 2. User side: When they submit a TrxID to claim a recharge
router.post('/verify', paymentController.verifyUserPayment);

// 3. Admin side: To get the data for your "Payment Receive" table
router.get('/transactions', paymentController.getAllTransactions);

export default router;