import cron from "node-cron";
import User from "../models/User.js";

// Run every hour to check for pending approvals
cron.schedule('0 * * * *', async () => {
    // 24-hour business window (Adjust for Bangladesh holidays as needed)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find shops verified by SR but pending Distributor/Admin review
    const pendingShops = await User.find({
        role: 'SHOPKEEPER',
        kyc_status: 'TRIAL',
        updatedAt: { $lt: oneDayAgo }
    });

    pendingShops.forEach(shop => {
        // Option 03: Flash "Yellow" for Admin intervention
        console.log(`YELLOW ALERT: Shop ${shop.name} is pending review for > 24 hours.`);
        // You can integrate a push notification here for the Super Admin
    });
});