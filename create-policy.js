import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTERPRISE_ID = 'enterprises/LC03r84pbh';
const POLICY_ID = 'trvnx_standard_policy';

async function createPolicy() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'amapi-key.json'),
            scopes: ['https://www.googleapis.com/auth/androidmanagement'],
        });

        const client = await auth.getClient();
        const amapi = google.androidmanagement({ version: 'v1', auth: client });

        console.log("Pushing TRVNX Standard Protection Policy to Google...");

        const policyName = `${ENTERPRISE_ID}/policies/${POLICY_ID}`;

        await amapi.enterprises.policies.patch({
            name: policyName,
            requestBody: {
                // 1. Force-install your TRVNX Protector app
                applications: [
                    {
                        packageName: 'com.trvnx.protector',
                        installType: 'FORCE_INSTALLED',
                        defaultPermissionPolicy: 'GRANT'
                    }
                ],
                // 2. Core Security Restrictions
                factoryResetDisabled: true,
                debuggingFeaturesAllowed: false,
                safeBootDisabled: true,
                statusBarDisabled: false,
                // 3. Enforcement Rules (Required by Google)
                policyEnforcementRules: [
                    {
                        settingName: 'factoryResetDisabled',
                        blockAction: {
                            blockAfterDays: 0 // Block immediately if they try to bypass
                        },
                        wipeAction: {
                            wipeAfterDays: 30 // Fallback requirement (set high so it doesn't trigger)
                        }
                    }
                ]
            }
        });

        console.log("\n========================================");
        console.log("SUCCESS: Policy 'trvnx_standard_policy' is live!");
        console.log("========================================");

    } catch (err) {
        console.error("Policy creation failed:", JSON.stringify(err.response?.data || err.message, null, 2));
    }
}

createPolicy();