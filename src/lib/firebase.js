import admin from 'firebase-admin';

if (!admin.apps.length) {
    if (process.env.FIREBASE_CREDENTIALS) {
        try {
            // 1. Grab the Base64 string from the environment variable
            const base64Credentials = process.env.FIREBASE_CREDENTIALS;

            // 2. Decode it back into a normal text string
            const decodedString = Buffer.from(base64Credentials, 'base64').toString('utf8');

            // 3. Parse the clean string into a JSON object
            const serviceAccount = JSON.parse(decodedString);

            // 4. Initialize Firebase
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("✅ [FIREBASE LIB]: Initialized Successfully.");
        } catch (err) {
            console.error("❌ [FIREBASE LIB]: Initialization Error:", err.message);
        }
    } else {
        console.error("❌ [FIREBASE LIB]: FIREBASE_CREDENTIALS environment variable NOT FOUND.");
    }
}

export default admin;