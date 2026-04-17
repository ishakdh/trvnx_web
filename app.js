import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import mongoose from "mongoose";


dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;

// --- 1. MONGODB DATABASE CONNECTION ---
// Make sure you have MONGO_URI="your_mongodb_connection_string" in your .env file!
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/trvnx";

mongoose.connect(MONGO_URI)
    .then(() => console.log("[DB] 🟢 MongoDB Successfully Connected!"))
    .catch(err => console.log("[DB] 🔴 MongoDB Connection Error:", err));

// --- 2. DATABASE SCHEMA ---
const deviceSchema = new mongoose.Schema({
    imei: String,
    socketId: String,
    status: { type: String, default: 'offline' },
    lastSeen: { type: Date, default: Date.now }
});
const Device = mongoose.model("Device", deviceSchema);

// --- 3. THE WEB DASHBOARD (Frontend) ---
app.get('/', (req, res) => {
    // Note: The escaped backslashes inside this block are CORRECT because
    // they are nested inside the larger res.send() backticks.
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

                // Load devices when page opens
                fetchDevices();
                // Auto-refresh every 5 seconds
                setInterval(fetchDevices, 5000);
            </script>
        </body>
        </html>
    `);
});

// --- 4. THE REST API (Backend) ---
// Get all devices from DB
app.get('/api/devices', async (req, res) => {
    const devices = await Device.find().sort({ lastSeen: -1 });
    res.json(devices);
});

// Lock a specific device
app.get('/api/lock/:socketId', (req, res) => {
    const targetSocket = req.params.socketId;
    io.to(targetSocket).emit("remote_lock", { action: "FORCE_LOCK" });
    console.log(`[API] Target Lock sent to ${targetSocket}`); // FIXED
    res.json({ success: true, message: "Target Locked!" });
});


// --- 5. SOCKET.IO AGENT TRACKING ---
io.on("connection", (socket) => {
    console.log(`[CONN] Socket Connected: ${socket.id}`); // FIXED

    // When the phone app sends its IMEI
    socket.on("register_device", async (data) => {
        console.log(`[REG] Device ${data.imei} is ONLINE`);

        // 🚀 FIXED: Added $set to satisfy the strict IDE Mongoose types
        await Device.findOneAndUpdate(
            { imei: data.imei },
            { $set: { socketId: socket.id, status: 'online', lastSeen: Date.now() } },
            { upsert: true, new: true }
        );
    });

    socket.on("disconnect", async () => {
        console.log(`[DISCONN] Socket Offline: ${socket.id}`);

        // 🚀 FIXED: Added $set to satisfy the strict IDE Mongoose types
        await Device.findOneAndUpdate(
            { socketId: socket.id },
            { $set: { status: 'offline', lastSeen: Date.now() } }
        );
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log("==========================================");
    console.log(`TRVNX MASTER SERVER LIVE ON PORT ${PORT}`); // FIXED
    console.log("==========================================");
});