import mongoose from 'mongoose';
import fs from 'fs';
import User from './src/models/User.js'; // Ensure path is correct
import dotenv from 'dotenv';

dotenv.config();

const exportData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trvnx_db');
        console.log("Connected to DB...");

        const users = await User.find({});

        let fileContent = "TRVNX SYSTEM - IDENTITY EXPORT\n";
        fileContent += "====================================\n\n";

        users.forEach(u => {
            fileContent += `NAME: ${u.name}\n`;
            fileContent += `ROLE: ${u.role}\n`;
            fileContent += `PHONE/ID: ${u.phone}\n`;
            fileContent += `HASHED_PWD: ${u.password}\n`; // Remember: Passwords are encrypted!
            fileContent += `STATUS: ${u.status}\n`;
            fileContent += `------------------------------------\n`;
        });

        fs.writeFileSync('identities.txt', fileContent);
        console.log("✅ SUCCESS: identities.txt has been generated!");
        process.exit();
    } catch (err) {
        console.error("Export Failed:", err);
        process.exit(1);
    }
};

exportData();