const admin = require('firebase-admin');
const express = require('express');
const path = require('path'); // Added for file path handling

// 1. IMPORT YOUR FIREBASE KEY
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(express.json());

// --- NEW ADDITION FOR THE DASHBOARD ---
// This tells the server to show the files in the "public" folder
// when you visit http://localhost:3000 in your browser.
app.use(express.static(path.join(__dirname, 'public')));

/**
 * ENDPOINT 1: REMOTE LOCK
 * Triggers the Red Lock Screen via FCM.
 */
app.post('/api/device/lock', async (req, res) => {
    const { token, storeName, phoneNumber } = req.body;

    if (!token) {
        return res.status(400).send({ success: false, error: "Device Token is missing!" });
    }

    const message = {
        data: {
            command: "lock_device",
            store_name: storeName || "TRVNX Security Store",
            phone_number: phoneNumber || "Contact Admin"
        },
        token: token
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Lock command sent successfully:', response);
        res.status(200).send({ success: true, message: "Device has been locked." });
    } catch (error) {
        console.error('Error sending lock command:', error);
        res.status(500).send({ success: false, error: error.message });
    }
});

/**
 * ENDPOINT 2: SILENT LOCATION FETCH
 * Triggers the Asset Recovery Service.
 */
app.post('/api/device/location', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).send({ success: false, error: "Device Token is missing!" });
    }

    const message = {
        data: {
            command: "get_location"
        },
        token: token
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Location request sent:', response);
        res.status(200).send({ success: true, message: "Location request is in progress." });
    } catch (error) {
        console.error('Error requesting location:', error);
        res.status(500).send({ success: false, error: error.message });
    }
});

// Start the server on Port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`TRVNX BACKEND IS ONLINE`);
    console.log(`Visit: http://localhost:${PORT} to open the Panel`);
    console.log(`=========================================`);
});