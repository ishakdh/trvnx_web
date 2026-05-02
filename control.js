const admin = require('firebase-admin');
const express = require('express');
const path = require('path'); // Added for file path handling

// ==========================================
// 1. FIREBASE INITIALIZATION (BASE64 SECURE)
// ==========================================

// Grab the Base64 string from Coolify environment variables
const base64Credentials = process.env.FIREBASE_CREDENTIALS;

if (!base64Credentials) {
    console.error("CRITICAL ERROR: FIREBASE_CREDENTIALS environment variable is missing!");
    process.exit(1); // Stop the server if the key is missing
}

// Decode the Base64 string back into normal text
const decodedString = Buffer.from(base64Credentials, 'base64').toString('utf8');

// Parse the clean string into a JSON object
const serviceAccount = JSON.parse(decodedString);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// ==========================================
// 2. EXPRESS APP SETUP
// ==========================================
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

// Start the server (Using process.env.PORT makes it play nice with Coolify)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`TRVNX BACKEND IS ONLINE`);
    console.log(`Visit: http://localhost:${PORT} to open the Panel`);
    console.log(`=========================================`);
});