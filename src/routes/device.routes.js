import express from 'express';
// 🚀 FIXED: Goes UP (../) then DOWN into src/controllers
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
    confirmUninstallStatus // 🚀 NEW: Added missing import for the handshake
} from '../controllers/device.controller.js';

const router = express.Router();

router.get('/shop/:shopId', getShopDevices);
router.post('/register', registerDevice);

// 🚀 THE FIX: Changed from '/activate' to '/app-activate' to perfectly match the Android App!
router.post('/app-activate', activateAppLicense);

router.post('/track', trackDevice);
router.post('/update-location', updateDeviceLocation);
router.post('/toggle-lock', toggleDeviceLock);
router.post('/collect-emi', collectEmi);
router.post('/extend', extendDueDate);
router.post('/uninstall', uninstallDevice);

// 🚀 NEW: Added the HTTP fallback route for the device to confirm uninstallation
router.post('/confirm-uninstall', confirmUninstallStatus);

export default router;