import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * 1. LOGIC: The Front Gate (Protect)
 * Verifies the user's identity and checks if their account is still ACTIVE.
 */
export const protect = async (req, res, next) => {
    let token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "AUTHORIZATION_REQUIRED" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'TRVNX_SECRET_KEY');
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "USER_NOT_FOUND" });
        }

        // Logic: The Kill-Switch check
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ message: "ACCOUNT_SUSPENDED_CONTACT_ADMIN" });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: "TOKEN_EXPIRED_OR_INVALID" });
    }
};

/**
 * 2. LOGIC: The Room Key (Authorize)
 * Checks if the user's role has the specific permission (read/edit/action).
 */
export const authorize = (requiredPermission) => {
    return (req, res, next) => {
        // Super Admin bypasses all checks
        if (req.user.role === 'SUPER_ADMIN') return next();

        // Safety check to prevent server crashes if permissions object is empty
        if (!req.user.permissions || !req.user.permissions[requiredPermission]) {
            return res.status(403).json({ message: `INSUFFICIENT_PRIVILEGES: ${requiredPermission}` });
        }
        next();
    };
};

/**
 * 3. LOGIC: Trial Phase Enforcement
 * Limits unverified Shopkeepers to 10 sales.
 */
export const checkTrialLimit = (req, res, next) => {
    if (
        req.user.role === 'SHOPKEEPER' &&
        req.user.kyc_status === 'TRIAL' &&
        (req.user.trial_sales_count || 0) >= 10
    ) {
        return res.status(403).json({ message: "TRIAL_LIMIT_REACHED: UPGRADE_KYC_REQUIRED" });
    }
    next();
};