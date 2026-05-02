import cron from "node-cron";
import User from "../models/User.js";

// Run every morning at 09:00 AM Dhaka Time
cron.schedule('0 9 * * *', async () => {
    console.log("Running 7-Day Idle Shop Check...");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
        // Find shopkeepers whose last sale was more than 7 days ago
        const idleShops = await User.find({
            role: 'SHOPKEEPER',
            kyc_status: 'ACTIVE',
            last_sale_at: { $lt: sevenDaysAgo }
        }).populate('parent_id', 'name phone'); // parent_id is the SR

        idleShops.forEach(shop => {
            console.log(`IDLE ALERT: ${shop.name} (SR: ${shop.parent_id?.name}) has no sales for 7 days.`);
            // This data will be picked up by the Marketing Panel Dashboard
        });
    } catch (error) {
        console.error("Idle Alert Service Error:", error);
    }
}, {
    timezone: "Asia/Dhaka"
});