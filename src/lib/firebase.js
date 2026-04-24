import admin from 'firebase-admin';

if (!admin.apps.length) {
    // Check for the 3 new variables we added to Coolify
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
        try {
            // Fix Coolify's newline escaping
            privateKey = privateKey.replace(/\\n/g, '\n');

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey
                })
            });
            console.log("✅ [FIREBASE LIB]: Initialized Successfully using 3-variable method.");
        } catch (err) {
            console.error("❌ [FIREBASE LIB]: Initialization Error:", err.message);
        }
    } else {
        // This is the error you were seeing in the logs!
        console.error("❌ [FIREBASE LIB]: New Firebase variables (ID, Email, or Key) NOT FOUND in Environment.");
    }
}

export default admin;