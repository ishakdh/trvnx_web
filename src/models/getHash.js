const crypto = require('crypto');
const fs = require('fs');

// Using the exact file path from your screenshot
const filePath = 'C:/rrapp_backend/public/downloads/lindux_staff_pro23.apk';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);

    // Creates the specific URL-safe Base64 format Android requires
    const base64UrlSafe = hashSum.digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    console.log("Your Checksum is:");
    console.log(base64UrlSafe);
} catch (err) {
    console.error("Error reading file:", err.message);
}