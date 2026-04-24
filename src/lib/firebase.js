import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    try {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

        if (!serviceAccountString) {
            throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON in Coolify Environment.");
        }

        // Let Node.js natively parse the JSON. This perfectly handles the private key formatting.
        const serviceAccount = JSON.parse(serviceAccountString);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log("✅ [FIREBASE LIB]: Firebase Initialized Successfully with JSON Object!");
    } catch (err) {
        console.error("❌ [FIREBASE LIB]: Initialization Error:", err.message);
    }
}

export default admin;