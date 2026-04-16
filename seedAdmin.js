import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

// Fix: Point dotenv to the config folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'config', '.env') });

const seedSuperAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/trvnx_db";
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB for seeding...");

        // Check if Admin already exists to prevent duplicates
        const existingAdmin = await User.findOne({ role: "SUPER_ADMIN" });
        if (existingAdmin) {
            console.log("Super Admin already exists. No need to seed.");
            process.exit();
        }

        const hashedPassword = await bcrypt.hash("admin123", 10);

        const admin = new User({
            name: "TRVNX Master Admin",
            phone: "01700000000",
            password: hashedPassword,
            role: "SUPER_ADMIN",
            permissions: {
                read: true,
                edit: true,
                action: true
            },
            territory: {
                division: "Dhaka",
                district: "Dhaka",
                police_station: "Central"
            }
        });

        await admin.save();
        console.log("--------------------------------------------------");
        console.log("SUCCESS: Super Admin created!");
        console.log("Login: 01700000000 / Password: admin123");
        console.log("--------------------------------------------------");
        process.exit();
    } catch (error) {
        console.error("Error during seeding:", error.message);
        process.exit(1);
    }
};

seedSuperAdmin();