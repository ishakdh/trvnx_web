import express from 'express';
import {
    getShopDevices,
    registerDevice,
    activateAppLicense,
    collectEmi,
    updateHeartbeat,
    toggleDeviceLock,
    trackDevice,
    confirmDeviceStatus,
    updateDeviceLocation,
    uninstallDevice,
    extendDueDate, // 🚀 IMPORTED THE EXISTING CONTROLLER FUNCTION
    confirmUninstallStatus, // 🚀 FIXED: Imported the uninstall success controller
    getAllDevices // 🚀 ADDED: Imported the get all devices controller
} from '../controllers/device.controller.js';

const router = express.Router();

// 🚀 ADDED: Super Admin Route to fetch all devices globally
router.get('/all', getAllDevices);

// Standard Routes
router.get('/shop/:shopId', getShopDevices);
router.post('/register', registerDevice);

// 🚀 FIXED: Route name changed to match MainActivity.java exactly
router.post('/app-activate', activateAppLicense);

router.post('/collect-emi', collectEmi);
router.post('/extend-due-date', extendDueDate); // 🚀 ADDED THE MISSING ROUTE HERE

// Command Center Routes (Server -> App)
router.post('/toggle-lock', toggleDeviceLock);
router.post('/track', trackDevice);
router.post('/heartbeat', updateHeartbeat);
router.post('/uninstall', uninstallDevice);

// App Feedback Routes (App -> Server)
router.post('/confirm-status', confirmDeviceStatus);
router.post('/update-location', updateDeviceLocation);
router.post('/confirm-uninstall', confirmUninstallStatus); // 🚀 FIXED: Added the route to catch the app's success message

export default router;