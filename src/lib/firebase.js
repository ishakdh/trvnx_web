import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Use process.cwd() to reach the root folder from any file
//const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

if (!admin.apps.length) {
    if (process.env.FIREBASE_CREDENTIALS) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("✅ [FIREBASE LIB]: Initialized Successfully.");
        } catch (err) {
            console.error("❌ [FIREBASE LIB]: Initialization Error:", err.message);
        }
    } else {
        console.error("❌ [FIREBASE LIB]: serviceAccountKey.json NOT FOUND at " + serviceAccountPath);
    }
}

export default admin;