import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function finalize() {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'amapi-key.json'),
        scopes: ['https://www.googleapis.com/auth/androidmanagement'],
    });

    const client = await auth.getClient();
    const amapi = google.androidmanagement({ version: 'v1', auth: client });

    // PASTE YOUR NEW TOKEN HERE
    const myToken = "EADhVzuw2oQr00xWEFXBntFgiGO8VmQnXp3oMd7Z_72Y6spuGna5S20Ek0JP8XRPvh5oWFualeXevJL5f0s7r3vSfB4-h9MRbU1oZXx6j7uJ-BNTB6cOnC3U";

    try {
        console.log("Attempting to finalize Enterprise...");
        const res = await amapi.enterprises.create({
            projectId: 'lindux-device',
            enterpriseToken: myToken,
            requestBody: {}
        });

        console.log("\n========================================");
        console.log("SUCCESS!");
        console.log("Your Enterprise ID is:", res.data.name);
        console.log("========================================");
    } catch (err) {
        console.error("Finalization failed:", err.response?.data || err.message);
    }
}

finalize();