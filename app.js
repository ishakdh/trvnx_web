import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";
import paymentRoutes from './src/routes/payment.routes.js';

// 🚀 RESTORED: All of your main system routes
import authRoutes from './src/routes/auth.routes.js';
import deviceRoutes from './src/routes/deviceRoutes.js';
import settingsRoutes from './src/routes/settings.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import transactionRoutes from './src/routes/transaction.routes.js';
import marketingRoutes from './src/routes/marketing.routes.js';
import locationRoutes from './src/routes/locationRoutes.js';
import User from "./src/models/User.js";
import testRoutes from "./src/routes/test.routes.js";
import { runAutomatedDueCheck } from './src/controllers/device.controller.js';

dotenv.config();
const app = express();
const httpServer = createServer(app);

// 🚀 RESTORED: Correct socket initialization for the full app
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan("dev"));

app.set('io', io);
// 🚀 TRIGGER AUTOMATED DUE LOCK CHECK EVERY 6 HOURS
setInterval(() => {
    runAutomatedDueCheck(io);
}, 21600000);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// 🚀 THIS FIXES THE APK DOWNLOAD LINK
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trvnx_db')
    .then(() => console.log("✅ DATABASE: Connected Successfully"))
    .catch(err => console.error("❌ DATABASE: Connection Failed", err));

// 🚀 RESTORED: Your Master Admin Seeder
const seedSuperAdmin = async () => {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log("⚠️ TRVNX DB EMPTY: Generating Master Identity...");
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
        } else {
            console.log("✅ TRVNX DB: Identities found, skipping seed.");
        }
    } catch (error) {
        console.error("❌ DB SEED ERROR:", error);
    }
};
seedSuperAdmin().catch(err => console.error("Seed Warning:", err));

// 🚀 RESTORED: These are the critical lines that fix your 404 Error!
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/test', testRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/locations', locationRoutes);

// --- THE WEB DASHBOARD (Frontend) ---
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>TRVNX Master Panel</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #121212; color: white; padding: 40px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #1e1e1e; }
                th, td { padding: 15px; text-align: left; border-bottom: 1px solid #333; }
                th { background-color: #d32f2f; color: white; }
                .status-online { color: #4caf50; font-weight: bold; }
                .status-offline { color: #f44336; font-weight: bold; }
                .btn { padding: 8px 15px; background-color: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; }
                .btn:hover { background-color: #b71c1c; }
                .header { display: flex; justify-content: space-between; align-items: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>TRVNX Command Center</h1>
                <button class="btn" onclick="fetchDevices()">🔄 Refresh List</button>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Device ID (IMEI)</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="device-table">
                    <tr><td colspan="4">Loading devices...</td></tr>
                </tbody>
            </table>

            <script>
                function fetchDevices() {
                    fetch('/api/devices')
                        .then(res => res.json())
                        .then(data => {
                            const table = document.getElementById('device-table');
                            table.innerHTML = '';
                            if(data.length === 0) return table.innerHTML = '<tr><td colspan="4">No devices found.</td></tr>';
                            
                            data.forEach(device => {
                                const statusClass = device.status === 'online' ? 'status-online' : 'status-offline';
                                const actionBtn = device.status === 'online' 
                                    ? \`<button class="btn" onclick="lockDevice('\${device.socketId}')">🔒 Lock</button>\` 
                                    : \`<button class="btn" style="background: #555; cursor:not-allowed;" disabled>Offline</button>\`;

                                table.innerHTML += \`
                                    <tr>
                                        <td>\${device.imei}</td>
                                        <td class="\${statusClass}">\${device.status.toUpperCase()}</td>
                                        <td>\${new Date(device.lastSeen).toLocaleString()}</td>
                                        <td>\${actionBtn}</td>
                                    </tr>
                                \`;
                            });
                        });
                }

                function lockDevice(socketId) {
                    fetch('/api/lock/' + socketId)
                        .then(res => res.json())
                        .then(data => alert(data.message));
                }

                fetchDevices();
                setInterval(fetchDevices, 5000);
            </script>
        </body>
        </html>
    `);
});

// --- SOCKET.IO EVENT TRACKING ---
io.on("connection", (socket) => {
    console.log("🌐 Client connected to Socket.io:", socket.id);

    // 🚀 RESTORED: Main App Socket Events
    socket.on("device_acknowledge", async (data) => {
        try {
            const { deviceId, command, status } = data;
            if (command === 'full_uninstall' && status === 'SUCCESS') {
                const Device = (await import('./src/models/Device.js')).default;
                await Device.findByIdAndUpdate(deviceId, { license_status: 'UNINSTALLED', is_locked: false });
                console.log(`✅ [SOCKET] Device ${deviceId} acknowledged UNINSTALL. Marking Uninstalled.`);
                io.emit("device_uninstalled_success", { deviceId });
            }
        } catch (err) {
            console.error("Socket Ack Error:", err);
        }
    });

    // Web Dashboard Socket Events
    socket.on("register_device", async (data) => {
        console.log(`[REG] Device ${data.imei} is ONLINE`);
        try {
            // 🚀 FIXED: Added ./src/
            const Device = (await import('./src/models/Device.js')).default;
            await Device.findOneAndUpdate(
                { imei: data.imei },
                { $set: { socketId: socket.id, status: 'online', lastSeen: new Date() } },
                { upsert: true, new: true }
            );
        } catch(err) {
            console.error("Device Register Error:", err);
        }
    });

    socket.on("disconnect", async () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
        try {
            // 🚀 FIXED: Added ./src/
            const Device = (await import('./src/models/Device.js')).default;
            await Device.findOneAndUpdate(
                { socketId: socket.id },
                { $set: { status: 'offline', lastSeen: new Date() } },
                { new: true }
            );
        } catch(err) {
            // Fails silently if disconnected client wasn't a registered device
        }
    });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log("--------------------------------------------------");
    console.log(`🚀 Server running on port ${PORT}`);
    console.log("--------------------------------------------------");
});