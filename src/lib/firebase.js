import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyB64 = process.env.FIREBASE_PRIVATE_KEY_B64;

    if (projectId && clientEmail && privateKeyB64) {
        try {
            // 1. Decode the Base64 string back to standard text
            let decodedKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');

            // 2. Aggressively fix any formatting, newlines, or hidden quotes
            decodedKey = decodedKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    clientEmail: clientEmail,
                    privateKey: decodedKey
                })
            });
            console.log("✅ [FIREBASE LIB]: Initialized Successfully via Base64!");
        } catch (err) {
            console.error("❌ [FIREBASE LIB]: Initialization Error:", err.message);
        }
    } else {
        console.error("❌ [FIREBASE LIB]: Missing B64 variables in Environment.");
    }
}

export default admin;