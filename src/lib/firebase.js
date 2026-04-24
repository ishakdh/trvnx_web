import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    try {
        const b64Json = process.env.FIREBASE_B64_JSON;

        if (!b64Json) {
            throw new Error("Missing FIREBASE_B64_JSON in Coolify.");
        }

        // Decode the Base64 string back to the raw JSON text
        const decodedJson = Buffer.from(b64Json, 'base64').toString('utf8');
        
        // Parse it natively
        const serviceAccount = JSON.parse(decodedJson);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        
        console.log("✅ [FIREBASE LIB]: Securely Initialized via Base64 JSON!");
    } catch (err) {
        console.error("❌ [FIREBASE LIB]: Initialization Error:", err.message);
    }
}

export default admin;
