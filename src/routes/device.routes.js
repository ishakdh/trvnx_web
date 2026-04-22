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
    pushAppUpdate // 🚀 Cleaned up to live with the others
} from '../controllers/device.controller.js';

const router = express.Router();

router.get('/shop/:shopId', getShopDevices);
router.post('/register', registerDevice);
router.post('/update-app', pushAppUpdate);

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