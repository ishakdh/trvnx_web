import admin from 'firebase-admin';

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyB64 = process.env.FIREBASE_PRIVATE_KEY_B64; // Use the B64 version

    if (projectId && clientEmail && privateKeyB64) {
        try {
            // Decode the Base64 string back to the real PEM key
            const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n')
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