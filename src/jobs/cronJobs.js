import cron from 'node-cron';
import Device from '../models/Device.js';
import { sendFCMCommand } from '../utils/firebase.js'; // Ensure this utility exists!

export const startCronJobs = () => {
    // ⏰ RUNS EVERY DAY AT 00:01 AM
    cron.schedule('1 0 * * *', async () => {
        console.log('[CRON] Initiating midnight device scan...');
        try {
            const today = new Date();
            const reminderDate = new Date();
            reminderDate.setDate(today.getDate() + 3); // 3-Day Warning

            // ==========================================
            // 1. AUTO LOCK: If payment is overdue
            // ==========================================
            const overdueDevices = await Device.find({ next_due_date: { $lt: today }, is_locked: false });

            for (let device of overdueDevices) {
                // Only send Firebase command if the token exists
                if (device.fcm_token) {
                    await sendFCMCommand(device.fcm_token, { action: 'LOCK_DEVICE', message: 'PAYMENT_OVERDUE' });
                }

                device.is_locked = true;
                device.status = 'OVERDUE';
                await device.save();

                console.log(`[LOCK EXECUTED] IMEI: ${device.imei} marked as overdue.`);
            }

            // ==========================================
            // 2. PAYMENT REMINDER: Send 3-day warning
            // ==========================================
            const reminderDevices = await Device.find({
                next_due_date: { $gte: today, $lte: reminderDate },
                is_locked: false // Don't remind them if they are already locked
            });

            for (let device of reminderDevices) {
                if (device.fcm_token) {
                    await sendFCMCommand(device.fcm_token, {
                        action: 'SHOW_NOTIFICATION',
                        title: 'TRVNX EMI Reminder',
                        body: `Your EMI of ৳${device.monthly_emi} is due on ${device.next_due_date.toLocaleDateString('en-GB')}`
                    });
                    console.log(`[REMINDER SENT] IMEI: ${device.imei}`);
                }
            }

            console.log(`[CRON] Scan complete. Locked: ${overdueDevices.length} | Reminded: ${reminderDevices.length}`);
        } catch (error) {
            console.error('[CRON ERROR] Failed during daily scan:', error);
        }
    });
};