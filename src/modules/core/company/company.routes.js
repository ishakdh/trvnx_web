import express from "express";
// import { createProduct, getProducts } from "./product/product.controller.js";
// import { authMiddleware } from "../../middlewares/auth.js";

const router = express.Router();

// router.post("/products", authMiddleware, createProduct);
// router.get("/products", authMiddleware, getProducts);

router.get("/", (req, res) => {
    res.json({
        "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
            "com.rrapp/.MyDeviceAdminReceiver",

        "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
            "https://yourserver.com/rrapp.apk",

        "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM":
            "BASE64_CHECKSUM",

        "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": true
    })
});

export default router;