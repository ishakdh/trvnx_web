import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function auth(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token)
        return res.status(401).json({ message: "Unauthenticated" });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.find(payload.id);
        next();
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
}