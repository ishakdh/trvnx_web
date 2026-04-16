import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors"; // 🚀 FIXED: Added CORS so React can talk to Express

// 🚀 FIXED: Import your auth routes!
// Note: Make sure this path correctly points to where your auth.routes.js file is located.
// E.g., if it's in a 'routes' folder: import authRoutes from "./routes/auth.routes.js";
import authRoutes from "./routes/auth.routes.js";

// 1. Tell Node to look in the current folder for .env
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- 🚀 NEW EXPRESS MIDDLEWARES ---
app.use(cors()); // Allows your React app to bypass browser security blocks
app.use(express.json()); // Allows Express to read req.body from your frontend

// --- 🚀 CONNECT YOUR ROUTES ---
// This tells Express: "Any URL starting with /api/auth should look inside auth.routes.js"
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
const MASTER_PASS = process.env.MASTER_PASSWORD;

// --- STARTUP TEST ---
console.log("--------------------------------------------------");
if (MASTER_PASS) {
    console.log(`[SYSTEM] Success! Password loaded: ${MASTER_PASS}`);
} else {
    console.log(`[ERROR] Password NOT found! Check your .env file location.`);
}
console.log("--------------------------------------------------");

io.on("connection", (socket) => {
    // ... (rest of your connection code)

    socket.on("verify_uninstall", (data) => {
        // Use .trim() to ignore accidental spaces from the phone keyboard
        const received = data.password.trim();
        const expected = MASTER_PASS ? MASTER_PASS.trim() : "";

        console.log(`[AUTH] Comparing: "${received}" vs "${expected}"`);

        if (received === expected && expected !== "") {
            console.log(`[AUTH] MATCH!`);
            socket.emit("uninstall_response", { success: true });
        } else {
            console.log(`[AUTH] FAIL!`);
            socket.emit("uninstall_response", { success: false });
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`TRVNX Server running on Port: ${PORT}`);
});