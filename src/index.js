import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

// 🚀 FIXED: Imported bcrypt so the seeder actually works!
import bcrypt from "bcryptjs";

import authRoutes from './modules/auth/auth.routes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import settingsRoutes from './routes/settings.routes.js';
import adminRoutes from './routes/admin.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import marketingRoutes from './routes/marketing.routes.js';
import locationRoutes from './routes/locationRoutes.js';
import User from "./models/User.js";
import testRoutes from "./routes/test.routes.js";

dotenv.config();
const app = express();
const httpServer = createServer(app);

// 🚀 2. START SOCKET.IO
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MIDDLEWARES ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// 🚀 FIXED: Consolidated body parsers here with the 10mb limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan("dev"));

// 🚀 EXPOSE SOCKET IO TO ALL CONTROLLERS GLOBALLY
app.set('io', io);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- DATABASE ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trvnx_db')
    .then(() => console.log("✅ DATABASE: Connected Successfully"))
    .catch(err => console.error("❌ DATABASE: Connection Failed", err));


// --- SEEDER ---
const seedSuperAdmin = async () => {
    try {
        const userCount = await User.countDocuments();

        if (userCount === 0) {
            console.log("⚠️ TRVNX DB EMPTY: Generating Master Identity...");

            // This will now work perfectly because bcrypt is imported!
            const hashedPassword = await bcrypt.hash("Raihan@!1611", 10);

            const superAdmin = new User({
                name: "Master System Admin",
                phone: "01711111111",
                password: hashedPassword,
                role: "ADMIN",
                permissions: [
                    'HOME', 'FINANCE_INCOME', 'FINANCE_EXPENSE', 'BALANCE_SHEET',
                    'CASH_BOOK', 'UNUSED_BALANCE', 'RECHARGE', 'DISTRIBUTOR_PAYOUTS',
                    'ALL_DEVICES', 'DISTRIBUTOR_SR', 'MARKETING', 'SHOP',
                    'LICENSE_FEE', 'PAYMENT_GATEWAY', 'QR_CODE', 'ACTIVITY_LOGS'
                ]
            });

            await superAdmin.save();
            console.log("✅ MASTER IDENTITY ESTABLISHED.");
            console.log("📞 Phone: 01711111111");
            console.log("🔑 Key: Raihan@!1611");
        } else {
            console.log("✅ TRVNX DB: Identities found, skipping seed.");
        }
    } catch (error) {
        console.error("❌ DB SEED ERROR:", error);
    }
};

seedSuperAdmin();

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/test', testRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/locations', locationRoutes);

app.get('/', (req, res) => res.send('🚀 TRVNX API ONLINE'));

// 🚀 ENHANCED SOCKET CONNECTION & HANDSHAKE LOOP
io.on("connection", (socket) => {
    console.log("🌐 Client connected to Socket.io:", socket.id);

    socket.on("device_acknowledge", async (data) => {
        try {
            const { deviceId, command, status } = data;

            if (command === 'full_uninstall' && status === 'SUCCESS') {
                const Device = (await import('./models/Device.js')).default;
                await Device.findByIdAndUpdate(deviceId, { license_status: 'UNINSTALLED', is_locked: false });

                console.log(`✅ [SOCKET] Device ${deviceId} acknowledged UNINSTALL. Marking Uninstalled.`);
                io.emit("device_uninstalled_success", { deviceId });
            }
        } catch (err) {
            console.error("Socket Ack Error:", err);
        }
    });

    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log("--------------------------------------------------");
    console.log(`🚀 Server running on port ${PORT}`);
    console.log("--------------------------------------------------");
});