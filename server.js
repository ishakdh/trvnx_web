import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
// 🚀 1. Import the new controller function
import { runAutomatedDueCheck } from './src/controllers/device.controller.js';

const app = express();
app.use(cors());
app.use(express.json());

// 🚀 2. Initialize the interval AFTER app is created
// Run the check every 6 hours
setInterval(() => {
    // Note: This assumes you have 'io' set on app in your main App.js
    const io = app.get('io');
    runAutomatedDueCheck(io);
}, 21600000);

// CONNECT TO MONGODB
mongoose.connect('mongodb://127.0.0.1:27017/trvnx_os')
    .then(() => console.log("✅ Connected to TRVNX Database"))
    .catch(err => console.log("❌ DB Connection Error: ", err));

// Register API
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role, address } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword,
            role,
            address: {
                line1: address.line1,
                line2: address.line2,
                division: address.division,
                district: address.district,
                police_station: address.police_station
            }
        });

        await newUser.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));