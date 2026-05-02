import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTERPRISE_ID = 'enterprises/LC03r84pbh';
const POLICY_ID = 'trvnx_standard_policy';

async function generateToken() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'amapi-key.json'),
            scopes: ['https://www.googleapis.com/auth/androidmanagement'],
        });

        const client = await auth.getClient();
        const amapi = google.androidmanagement({ version: 'v1', auth: client });

        console.log("Generating Enrollment Token for TRVNX...");

        const response = await amapi.enterprises.enrollmentTokens.create({
            parent: ENTERPRISE_ID,
            requestBody: {
                policyName: `${ENTERPRISE_ID}/policies/${POLICY_ID}`,
                duration: '2592000s', // Token valid for 30 days
            }
        });

        console.log("\n========================================");
        console.log("SUCCESS: ENROLLMENT DATA GENERATED");
        console.log("========================================\n");
        console.log("1. Copy the 'qrCode' string below:");
        console.log("----------------------------------------");
        console.log(response.data.qrCode);
        console.log("----------------------------------------\n");
        console.log("2. Enrollment URL (for manual entry):");
        console.log(response.data.value);
        console.log("\n========================================");

    } catch (err) {
        console.error("Token generation failed:", err.response?.data || err.message);
    }
}

generateToken();