import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

// 🚀 FIXED: Path updated to match your image structure (modules/auth/)
import authRoutes from './modules/auth/auth.routes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import settingsRoutes from './routes/settings.routes.js';

// 🚀 NEW: Import the Admin and Transaction routes we just updated!
import adminRoutes from './routes/admin.routes.js';
import transactionRoutes from './routes/transaction.routes.js';

// 🔥 NEW: Import the Marketing routes
import marketingRoutes from './routes/marketing.routes.js';

// 📍 MISSING LINE ADDED: Import Location routes for Districts/Thanas
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
    origin: '*', // For now, allow all domains. You can lock this down to 'https://app.trvnx.com' later.
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));

// 🚀 EXPOSE SOCKET IO TO ALL CONTROLLERS GLOBALLY
app.set('io', io);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- DATABASE ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trvnx_db')
    .then(() => console.log("✅ DATABASE: Connected Successfully"))
    .catch(err => console.error("❌ DATABASE: Connection Failed", err));

// Add these to the top of your file if they aren't there already:
// import User from './modules/auth/models/User.js'; // <-- Change to your actual User model path
// import bcrypt from 'bcryptjs';

const seedSuperAdmin = async () => {
    try {
        // 1. Check if any users exist
        const userCount = await User.countDocuments();

        if (userCount === 0) {
            console.log("⚠️ TRVNX DB EMPTY: Generating Master Identity...");

            // 2. Securely hash the default password
            const hashedPassword = await bcrypt.hash("Raihan@!1611", 10);

            // 3. Create the Master Record
            const superAdmin = new User({
                name: "Master System Admin",
                phone: "01711111111",
                password: hashedPassword,
                role: "ADMIN", // Or "SUPER_ADMIN" depending on what your schema expects
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
            console.log("🔑 Key: admin123");
        } else {
            console.log("✅ TRVNX DB: Identities found, skipping seed.");
        }
    } catch (error) {
        console.error("❌ DB SEED ERROR:", error);
    }
};


// Run the function
seedSuperAdmin().then(res=>console.log(res)).catch(err => console.log(err));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/test', testRoutes);

// 🚀 NEW: Mount the admin and transaction endpoints so the frontend can hit them!
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);

// 🔥 NEW: Mount the marketing endpoints
app.use('/api/marketing', marketingRoutes);

// 📍 MISSING LINE ADDED: Mount the location endpoints
app.use('/api/locations', locationRoutes);


app.get('/', (req, res) => res.send('🚀 TRVNX API ONLINE'));

// 🚀 ENHANCED SOCKET CONNECTION & HANDSHAKE LOOP
io.on("connection", (socket) => {
    console.log("🌐 Client connected to Socket.io:", socket.id);

    // 🚀 NEW: Handshake Acknowledgment Loop for Device Confirmation
    socket.on("device_acknowledge", async (data) => {
        try {
            const { deviceId, command, status } = data;

            if (command === 'full_uninstall' && status === 'SUCCESS') {
                // Dynamically import Device model to prevent circular crashes
                const Device = (await import('./models/Device.js')).default;
                await Device.findByIdAndUpdate(deviceId, { license_status: 'UNINSTALLED', is_locked: false });

                console.log(`✅ [SOCKET] Device ${deviceId} acknowledged UNINSTALL. Marking Uninstalled.`);

                // Immediately tell admin/distributor dashboards to refresh their tables
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// --- START SERVER ---
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log("--------------------------------------------------");
    console.log("--------------------------------------------------");
});