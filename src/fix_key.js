import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function fix() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/trvnx_db');

        // Hashing the password "admin123" correctly
        const newHashedPassword = await bcrypt.hash("admin123", 10);

        await User.findOneAndUpdate(
            { phone: "01700000000" },
            { password: newHashedPassword }
        );

        console.log("-----------------------------------------");
        console.log("✅ KEY REPAIRED: 01700000000 is now ready.");
        console.log("Authorization Key: admin123");
        console.log("-----------------------------------------");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();