import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../../../models/User.js";

export class AuthService {

    async register(data) {
        data.password = await bcrypt.hash(data.password, 10);
        return User.create(data);
    }

    async login(email, password) {
        // 1️⃣ Fetch user including password
        const qb = await User.query();
        const user = await qb.where("email", "=", email).first({ includeHidden: true });

        if (!user) throw new Error("User Not found");

        // 2️⃣ Compare passwords
        const valid = await bcrypt.compare(password, user.$attributes.password);
        if (!valid) throw new Error("Invalid credentials");

        // 3️⃣ Generate JWT
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // 4️⃣ Sanitize user before returning
        const { password: _pass, ...sanitizedUser } = user;

        return {
            user: sanitizedUser,
            token
        };
    }
}