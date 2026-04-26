import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function auth(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token)
        return res.status(401).json({ message: "Unauthenticated" });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // 🚀 CRITICAL FIX: Changed .find() to .findById()
        req.user = await User.findById(payload.id);

        next();
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
}