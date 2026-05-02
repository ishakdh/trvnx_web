import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const seedSystem = async () => {
    try {
        // 1. Connect to Database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trvnx_db');
        console.log("🛠️  CONNECTING TO TRVNX CORE...");

        // 2. Clear Existing Users (Optional: Remove if you want to keep old users)
        await User.deleteMany({});
        console.log("🧹 DATABASE PURGED.");

        const hashedPassword = await bcrypt.hash("123456", 10);

        // 3. Create Super Admin (The Boss)
        const superAdmin = await User.create({
            name: "Master Admin",
            phone: "01711111111",
            password: hashedPassword,
            role: "SUPER_ADMIN",
            territory: { division: "Dhaka", district: "Dhaka", police_station: "Gulshan" },
            permissions: { read: true, edit: true, action: true }
        });

        // 4. Create a Shopkeeper (The Field User)
        await User.create({
            name: "Bhai Bhai Telecom",
            phone: "01722222222",
            password: hashedPassword,
            role: "SHOPKEEPER",
            parent_id: superAdmin._id, // Linked to Admin
            territory: { division: "Dhaka", district: "Dhaka", police_station: "Mirpur" },
            permissions: { read: true, edit: false, action: false },
            kyc_status: "TRIAL",
            current_balance: 500
        });

        console.log("✅ SYSTEM SEEDED SUCCESSFULLY!");
        console.log("------------------------------");
        console.log("ADMIN LOGIN: 01711111111 / 123456");
        console.log("SHOPKEEPER LOGIN: 01722222222 / 123456");
        console.log("------------------------------");

        process.exit();
    } catch (error) {
        console.error("❌ SEEDING FAILED:", error);
        process.exit(1);
    }
};

seedSystem();