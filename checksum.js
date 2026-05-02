import  fs from "fs"
import crypto from "crypto"

const apk = fs.readFileSync("./public/app-release.apk")

const sha256 = crypto.createHash("sha256").update(apk).digest("base64")

const urlSafe = sha256
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

console.log(urlSafe)