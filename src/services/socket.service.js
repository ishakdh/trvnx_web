import Sale from "../models/Sale.js";

// This map stores IMEI -> SocketID for real-time commands
const activeDevices = new Map();

export const socketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log("New Handshake attempt:", socket.id);

        // Step 1: App identifies itself with IMEI
        socket.on("register_device", (data) => {
            const { imei } = data;
            activeDevices.set(imei, socket.id);
            console.log(`Device Registered: IMEI ${imei} is now ONLINE`);
        });

        // Step 2: App sends heartbeat every 2 hours
        socket.on("device_heartbeat", async (data) => {
            const { device_id, status } = data;
            const imei = device_id; // Maps the Android 'device_id' to your 'imei' logic

            console.log(`Heartbeat received from IMEI: ${imei} | Status: ${status}`);

            await Sale.findOneAndUpdate(
                { imei1: imei },
                {
                    last_heartbeat: new Date(),
                    // Optionally update status to GREEN here if it was RED
                }
            );
        });

        // Step 3: Handle Disconnection
        socket.on("disconnect", () => {
            // Remove from active map when device goes offline
            for (let [imei, id] of activeDevices.entries()) {
                if (id === socket.id) {
                    activeDevices.delete(imei);
                    console.log(`Device Offline: IMEI ${imei}`);
                    break;
                }
            }
        });
    });

    // Make io and activeDevices accessible globally for controllers
    global.io = io;
    global.activeDevices = activeDevices;
};