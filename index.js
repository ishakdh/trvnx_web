import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import helmet from "helmet";
import path from "path";
import dotenv from "dotenv";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";

// --- ROUTE IMPORTS ---
import authRoutes from './src/routes/auth.routes.js';
import deviceRoutes from './src/routes/deviceRoutes.js';
import settingsRoutes from './src/routes/settings.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import transactionRoutes from './src/routes/transaction.routes.js';
import marketingRoutes from './src/routes/marketing.routes.js';
import locationRoutes from './src/routes/locationRoutes.js';
import testRoutes from "./src/routes/test.routes.js";
import User from "./src/models/User.js";

// 🚀 RESTORED: This was missing and would cause a crash!
import { runAutomatedDueCheck } from './src/controllers/device.controller.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// --- SOCKET.IO ---
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MIDDLEWARES ---
// Set security headers but allow cross-origin for APK downloads
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan("dev"));

app.set('io', io);

// 🚀 TRIGGER AUTOMATED DUE LOCK CHECK EVERY 6 HOURS
setInterval(() => {
    runAutomatedDueCheck(io);
}, 21600000);

// --- STATIC FOLDERS ---
// 🚀 FIXED: Simplified and pointing to your actual folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trvnx_db')
    .then(() => console.log("✅ DATABASE: Connected Successfully"))
    .catch(err => console.error("❌ DATABASE: Connection Failed", err));

// --- SEEDER ---
const seedSuperAdmin = async () => {
    try {
        const adminExists = await User.findOne({ phone: "01711111111" });
        if (!adminExists) {
            console.log("⚠️ MASTER ADMIN MISSING: Generating Identity...");
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
        }
    } catch (error) { console.error("❌ DB SEED ERROR:", error); }
};
seedSuperAdmin().catch(err => console.error("Seed Warning:", err));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/locations', locationRoutes);
app.use('/test', testRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", service: "TRVNX API Server" });
});

app.get('/', (req, res) => res.send('🚀 TRVNX API ONLINE'));

// --- SOCKET.IO LOGIC ---
io.on("connection", (socket) => {
    console.log("🌐 Client connected to Socket.io:", socket.id);
    socket.on("device_acknowledge", async (data) => {
        try {
            const { deviceId, command, status } = data;
            if (command === 'full_uninstall' && status === 'SUCCESS') {
                const Device = (await import('./src/models/Device.js')).default;
                await Device.findByIdAndUpdate(deviceId, { license_status: 'UNINSTALLED', is_locked: false });
                io.emit("device_uninstalled_success", { deviceId });
            }
        } catch (err) { console.error("Socket Ack Error:", err); }
    });
    socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log("--------------------------------------------------");
    console.log(`🚀 Server running on port ${PORT}`);
    console.log("--------------------------------------------------");
});