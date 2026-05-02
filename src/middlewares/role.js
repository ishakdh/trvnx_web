export function role(role) {
    return async (req, res, next) => {
        if (!(await req.user.hasRole(role)))
            return res.status(403).json({ message: "Forbidden" });

        next();
    };
}