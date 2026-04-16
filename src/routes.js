import path from "path"
import { fileURLToPath } from "url"

import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/core/user/user.routes.js";
import customerRoutes from "./modules/customer/customer.route.js";
import companyRoutes from "./modules/core/company/company.routes.js";

import orderRoutes from "./modules/order/order.routes.js";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper function for RESTful routes
export default function routes(app) {
    /* ======================
       Core & Auth
    ====================== */
    app.use("/health", (req,res)=> {
        res.json({
            success: true,
            status: "success",
            message: 'RRAPP Backend SERVER is Running'
        })
    });

    app.get("/download/app-release.apk", (req, res) => {
        res.download(path.join(__dirname, "../public/app-release.apk"))
    })

    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/customer", customerRoutes);
    app.use("/api/order", orderRoutes);
    app.use("/api/companies", companyRoutes);

    /* ======================
       404 Handler
    ====================== */
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: "Route not found"
        });
    });
}
