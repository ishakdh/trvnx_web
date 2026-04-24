import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        // Grab whichever variable Coolify is currently feeding the server
        let rawKey = process.env.FIREBASE_PRIVATE_KEY_B64 || process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !rawKey) {
            throw new Error("Missing Firebase Variables.");
        }

        // 1. If it's the Base64 string, decode it back to text first
        if (!rawKey.includes('PRIVATE KEY')) {
            rawKey = Buffer.from(rawKey, 'base64').toString('utf8');
        }

        // 2. Extract ONLY the pure letters/numbers of the key.
        // This aggressively strips out all headers, footers, squashed newlines, spaces, and hidden quotes.
        const pureKeyContent = rawKey
            .replace(/-----BEGIN PRIVATE KEY-----/gi, '')
            .replace(/-----END PRIVATE KEY-----/gi, '')
            .replace(/\\n/g, '')
            .replace(/\n/g, '')
            .replace(/\s+/g, '')
            .replace(/"/g, '')
            .trim();

        // 3. Mathematically rebuild the perfect PEM format (exactly 64 characters per line)
        const chunks = pureKeyContent.match(/.{1,64}/g);
        const perfectKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: perfectKey
            })
        });

        console.log("✅ [FIREBASE LIB]: Reconstructed PEM & Initialized Successfully!");
    } catch (err) {
        console.error("❌ [FIREBASE LIB]: Initialization Error:", err.message);
    }
}

export default admin;