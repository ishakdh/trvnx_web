import admin from 'firebase-admin';

// Grab the Base64 string from the environment variable
const base64Credentials = process.env.FIREBASE_CREDENTIALS;

if (!admin.apps.length) {
    if (base64Credentials) {
        try {
            // Decode the Base64 string back into a normal text string
            const decodedString = Buffer.from(base64Credentials, 'base64').toString('utf8');

            // Parse the clean string into a JSON object
            const serviceAccount = JSON.parse(decodedString);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                // Optional: databaseURL: "https://your-project-id.firebaseio.com"
            });
            console.log("✅ TRVNX CORE: FIREBASE_INITIALIZED");
        } catch (error) {
            console.error("❌ TRVNX CORE: FIREBASE_INIT_ERROR", error);
        }
    } else {
        console.error("❌ TRVNX CORE: FIREBASE_CREDENTIALS environment variable NOT FOUND.");
    }
}

export default admin;