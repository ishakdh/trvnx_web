import express from 'express';
import authRoutes from './auth.routes.js';
import deviceRoutes from './device.routes.js';
import saleRoutes from './sale.routes.js';
import accountsRoutes from './accounts.routes.js';
import marketingRoutes from './marketing.routes.js';
import supportRoutes from './support.routes.js';
import shopkeeperRoutes from './shopkeeper.routes.js';
import adminRoutes from './admin.routes.js';

// 🚀 NEW: Imported missing routes that the frontend was trying to reach
import transactionRoutes from './transection.routs.js'; // <- Fixed to match your exact file spelling
import settingsRoutes from './settings.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/sales', saleRoutes);
router.use('/accounts', accountsRoutes);
router.use('/marketing', marketingRoutes); // New
router.use('/support', supportRoutes);
router.use('/shopkeeper', shopkeeperRoutes);
router.use('/admin', adminRoutes);

// 🚀 NEW: Mounted the missing routes so the frontend stops getting 404s
router.use('/transactions', transactionRoutes);
router.use('/settings', settingsRoutes);

export default router;