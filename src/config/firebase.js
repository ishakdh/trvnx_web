import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load your service account key
// Make sure this file exists in your project root or config folder!
const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // Optional: databaseURL: "https://your-project-id.firebaseio.com"
        });
        console.log("✅ TRVNX CORE: FIREBASE_INITIALIZED");
    } catch (error) {
        console.error("❌ TRVNX CORE: FIREBASE_INIT_ERROR", error);
    }
}

export default admin;