import { google } from 'googleapis';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function runSetup() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'amapi-key.json'),
            scopes: ['https://www.googleapis.com/auth/androidmanagement'],
        });
        const amapi = google.androidmanagement({ version: 'v1', auth: await auth.getClient() });

        // 1. Generate the URL and keep the SESSION NAME
        const signup = await amapi.signupUrls.create({
            projectId: 'lindux-device',
            callbackUrl: 'https://server.trvnx.com'
        });

        console.log("\n1. OPEN THIS LINK NOW:\n" + signup.data.url);
        console.log("\n2. COMPLETE SIGNUP UNTIL YOU SEE YOUR SERVER URL.");

        rl.question('\n3. PASTE THE NEW enterpriseToken HERE: ', async (token) => {
            try {
                console.log("\nFinalizing with Signup Name:", signup.data.name);

                // 2. We pass the EXACT 'name' from step 1 into this call
                const enterprise = await amapi.enterprises.create({
                    signupUrlName: signup.data.name, // This connects the two steps
                    enterpriseToken: token.trim(),
                    projectId: 'lindux-device',
                    requestBody: {}
                });

                console.log("\n========================================");
                console.log("SUCCESS! ENTERPRISE CREATED.");
                console.log("Enterprise ID:", enterprise.data.name);
                console.log("========================================");
            } catch (err) {
                console.error("\nFinal step failed:", err.response?.data || err.message);
            }
            rl.close();
        });
    } catch (err) {
        console.error("Initial step failed:", err.message);
        rl.close();
    }
}

runSetup();