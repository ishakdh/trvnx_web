import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { login, register } from './controllers/authController.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Logic: Keep your existing rrapp_db connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rrapp_db')
    .then(() => console.log("✅ TRVNX Database Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("dev"));

// Logic: Your existing Auth endpoints
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Logic: Keep APK serving from the root /public folder
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

app.get('/app-release.apk', (req, res) => {
    const apkPath = path.join(publicPath, 'app-release.apk');
    res.download(apkPath, 'app-release.apk');
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", service: "TRVNX API Server" });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});