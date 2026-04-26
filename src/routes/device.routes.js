import express from 'express';
import {
    getShopDevices,
    registerDevice,
    activateAppLicense,
    trackDevice,
    updateDeviceLocation,
    toggleDeviceLock,
    collectEmi,
    extendDueDate,
    uninstallDevice,
    confirmUninstallStatus,
    pushAppUpdate
} from '../controllers/device.controller.js';

// 🚀 FIXED: Imported 'auth' to match your middleware file
// Make sure the filename here matches your actual file (e.g., authMiddleware.js or auth.js)
import { auth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ==========================================
// 📱 DEVICE-FACING ROUTES (UNPROTECTED)
// These are called by the Android App itself
// ==========================================
router.post('/register', registerDevice);
router.post('/app-activate', activateAppLicense);
router.post('/update-location', updateDeviceLocation);
router.post('/confirm-uninstall', confirmUninstallStatus);

// ==========================================
// 💻 DASHBOARD-FACING ROUTES (PROTECTED)
// These require a logged-in admin/shopkeeper (req.user)
// ==========================================
router.get('/shop/:shopId', auth, getShopDevices);
router.post('/update-app', auth, pushAppUpdate);

// 🚀 FIXED: All these now correctly use 'auth'
router.post('/track', auth, trackDevice);
router.post('/toggle-lock', auth, toggleDeviceLock);
router.post('/collect-emi', auth, collectEmi);
router.post('/extend', auth, extendDueDate);
router.post('/uninstall', auth, uninstallDevice);

export default router;