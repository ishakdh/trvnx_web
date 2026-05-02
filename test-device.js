import { io } from "socket.io-client";

// Connect to your Master Server (Running on port 5000)
const socket = io("http://localhost:5000");

socket.on("connect", () => {
    console.log("🟢 Fake Phone Connected to Master Server!");
    
    // As soon as it connects, it sends a fake IMEI to your server
    socket.emit("register_device", { imei: "999888777666555" });
    console.log("📡 Sent dummy IMEI to command center...");
});

// This listens for when you click the "FORCE LOCK" button on the dashboard
socket.on("remote_lock", (data) => {
    console.log("\n==========================================");
    console.log("🚨 ALARM: RECEIVED FORCE LOCK COMMAND!");
    console.log("Data received:", data);
    console.log("==========================================\n");
});

socket.on("disconnect", () => {
    console.log("🔴 Disconnected from server");
});