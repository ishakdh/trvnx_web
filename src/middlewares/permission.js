export function permission(permission) {
    return async (req, res, next) => {
        if (!(await req.user.hasPermission(permission)))
            return res.status(403).json({ message: "Forbidden" });

        next();
    };
}