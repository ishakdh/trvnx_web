import cron from "node-cron";
import Sale from "../models/Sale.js";

// Run every day at 00:01 Bangladesh Time
cron.schedule('1 0 * * *', async () => {
    console.log("Running Daily EMI Scheduler (Dhaka Time)...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);

    try {
        // 1. T-3 Notifications
        const t3Devices = await Sale.find({
            next_emi_date: { $gte: threeDaysFromNow, $lt: new Date(threeDaysFromNow.getTime() + 86400000) },
            status: 'ACTIVATED',
            payment_status: { $ne: 'FULL_PAID' }
        });

        t3Devices.forEach(device => {
            const socketId = global.activeDevices.get(device.imei1);
            if (socketId) {
                global.io.to(socketId).emit("notification", {
                    message: `Payment due in 3 days (${device.next_emi_date.toDateString()}).`
                });
            }
        });

        // 2. Auto-Lock Logic
        const overdueDevices = await Sale.find({
            next_emi_date: { $lte: today },
            status: 'ACTIVATED',
            auto_lock: true,
            payment_status: { $in: ['PENDING', 'OVERDUE'] }
        });

        overdueDevices.forEach(async (device) => {
            device.payment_status = 'OVERDUE';
            device.pending_command = 'LOCK';
            await device.save();

            const socketId = global.activeDevices.get(device.imei1);
            if (socketId) {
                global.io.to(socketId).emit("command_received", {
                    action: 'LOCK',
                    reason: 'EMI Overdue'
                });
            }
        });

    } catch (error) {
        console.error("EMI Scheduler Error:", error);
    }
}, {
    timezone: "Asia/Dhaka" // Force Bangladesh Timezone
});