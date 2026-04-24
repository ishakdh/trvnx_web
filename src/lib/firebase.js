import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        // Grab whichever variable you currently have saved in Coolify
        let rawKey = process.env.FIREBASE_PRIVATE_KEY_B64 || process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !rawKey) {
            throw new Error("Missing Firebase Variables in Coolify.");
        }

        // 1. If the key is Base64 (doesn't start with '-----BEGIN'), decode it first
        if (!rawKey.includes('-----BEGIN PRIVATE KEY-----')) {
            rawKey = Buffer.from(rawKey, 'base64').toString('utf8');
        }

        // 2. Aggressively strip Coolify's hidden garbage and fix line breaks
        const cleanKey = rawKey
            .replace(/\\n/g, '\n') // Fix literal string \n
            .replace(/\\r/g, '\r') // Fix Windows carriage returns
            .replace(/"/g, '')     // Remove hidden quotes Coolify adds
            .trim();               // Remove extra spaces at the start/end

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: cleanKey
            })
        });

        console.log("✅ [FIREBASE LIB]: Firebase Initialized Successfully!");
    } catch (err) {
        console.error("❌ [FIREBASE LIB]: Initialization Error:", err.message);
    }
}

export default admin;