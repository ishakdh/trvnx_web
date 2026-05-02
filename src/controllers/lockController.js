import cron from 'node-cron';
import Device from '../models/Device.js';
import { sendFCMCommand } from '../utils/firebase.js'; // Helper for Firebase

// ⏰ RUNS EVERY DAY AT MIDNIGHT
cron.schedule('0 0 * * *', async () => {
    const today = new Date();
    const reminderDate = new Date();
    reminderDate.setDate(today.getDate() + 3); // 3-Day Warning

    // 1. AUTO LOCK: If payment is overdue
    const overdueDevices = await Device.find({ next_payment_date: { $lt: today }, is_locked: false });
    overdueDevices.forEach(device => {
        sendFCMCommand(device.device_token, { action: 'LOCK_DEVICE', message: 'PAYMENT_OVERDUE' });
        device.is_locked = true;
        device.status = 'OVERDUE';
        device.save();
    });

    // 2. PAYMENT REMINDER: Send notification 3 days before
    const reminderDevices = await Device.find({
        next_payment_date: { $gte: today, $lte: reminderDate }
    });
    reminderDevices.forEach(device => {
        sendFCMCommand(device.device_token, {
            action: 'SHOW_NOTIFICATION',
            title: 'Payment Reminder',
            body: `Your EMI of ৳${device.installment_amount} is due on ${device.next_payment_date.toLocaleDateString()}`
        });
    });
});