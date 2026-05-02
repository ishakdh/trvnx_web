import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js'; // Ensure this path is correct

const reseed = async () => {
    try {
        // We use rrapp_db because that is what your index.js is looking for
        await mongoose.connect('mongodb://127.0.0.1:27017/rrapp_db');
        console.log("Connected to rrapp_db...");

        const hashedPassword = await bcrypt.hash("admin123", 10);

        const admin = new User({
            name: "TRVNX Master Admin",
            phone: "01700000000",
            password: hashedPassword,
            role: "SUPER_ADMIN",
            territory: {
                division: "Dhaka",
                district: "Dhaka",
                police_station: "Central"
            }
        });

        await admin.save();
        console.log("-----------------------------------------");
        console.log("✅ SUCCESS: User added to rrapp_db!");
        console.log("Login: 01700000000 / Password: admin123");
        console.log("-----------------------------------------");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

reseed();