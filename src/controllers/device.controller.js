import Device from '../models/Device.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import LicenseFee from '../models/LicenseFee.js';
import crypto from 'crypto';
import admin from '../lib/firebase.js';
import { logActivity } from '../utils/logger.js';

// 🚀 HIERARCHY COMMISSION HANDLER
async function runCommissionEngine(shopkeeper, type) {
    try {
        const sr = await User.findById(shopkeeper.parent_id);
        if (!sr) return;
        const distributor = await User.findById(sr.parent_id);

        if (sr.role === 'SR') {
            const srCut = type === 'ID_GEN' ? (sr.commissions?.per_user || 0) : (sr.commissions?.per_license || 0);
            if (srCut > 0) {
                await User.findByIdAndUpdate(sr._id, { $inc: { balance: srCut, commission_earned: srCut } });
                await new Transaction({ userId: sr._id, related_shop: shopkeeper._id, amount: srCut, type: 'SR_COMMISSION', status: 'SUCCESS', description: `SR Commission from ${shopkeeper.name}` }).save();
                if (distributor) {
                    await new Transaction({ userId: distributor._id, related_sr: sr._id, amount: srCut, type: 'DISTRIBUTOR_EXPENSE', status: 'SUCCESS', description: `SR Comm paid to ${sr.name}` }).save();
                }
            }
        }
        const activeDist = distributor || (sr.role === 'DISTRIBUTOR' ? sr : null);
        if (activeDist) {
            const distCut = type === 'ID_GEN' ? (activeDist.commissions?.per_user || 0) : (activeDist.commissions?.per_license || 0);
            if (distCut > 0) {
                await User.findByIdAndUpdate(activeDist._id, { $inc: { balance: distCut, commission_earned: distCut } });
                await new Transaction({ userId: activeDist._id, related_shop: shopkeeper._id, amount: distCut, type: 'COMMISSION', status: 'SUCCESS', description: `Distributor Commission from ${shopkeeper.name}` }).save();
            }
        }
    } catch (err) { console.error("Engine Error:", err); }
}

// 1. Get all devices for a shop
export const getShopDevices = async (req, res) => {
    try {
        const { shopId } = req.params;
        const shop = await User.findById(shopId);
        const devices = await Device.find({ shopkeeper_id: shopId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, devices, live_balance: shop ? shop.balance : 0 });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 2. Register a new device
export const registerDevice = async (req, res) => {
    try {
        const payload = req.body;
        const licenseKey = `TRVNX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const photoPath = req.files && req.files['customer_photo'] ? req.files['customer_photo'][0].path : null;
        const nidPath = req.files && req.files['nid_card'] ? req.files['nid_card'][0].path : null;
        const months = Number(payload.installment_months) || 1;
        const offlineOtps = [];
        for (let i = 1; i <= months; i++) {
            offlineOtps.push({ month: i, open_otp: Math.floor(100000 + Math.random() * 900000).toString(), ex_otp: Math.floor(100000 + Math.random() * 900000).toString(), is_used: false });
        }
        const newDevice = new Device({
            ...payload,
            auto_lock: payload.auto_lock !== undefined ? payload.auto_lock : true,
            paid_so_far: Number(payload.down_payment) || 0,
            license_key: licenseKey,
            offline_otps: offlineOtps,
            customer_photo: photoPath,
            nid_card: nidPath,
            next_due_date: payload.emi_start_date || new Date()
        });
        await newDevice.save();
        res.status(201).json({ success: true, licenseKey });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 3. Activate License (🚀 STRICT & FLEXIBLE MATRIX MATCHING)
export const activateAppLicense = async (req, res) => {
    try {
        const { license_key, real_imei1, fcm_token } = req.body;
        const device = await Device.findOne({ license_key: license_key }).populate('shopkeeper_id');
        if (!device) return res.status(404).json({ success: false, message: "License not found" });

        if (device.license_status === 'PENDING') {
            device.imei = real_imei1;
            const shop = await User.findById(device.shopkeeper_id);
            if (!shop) return res.status(404).json({ success: false, message: "Shopkeeper not found" });

            // 1. Gather all possible target tags
            const targets = [];
            if (shop.address?.district) {
                targets.push(shop.address.district.trim());
                targets.push(`DISTRICT: ${shop.address.district.trim()}`);
            }
            if (shop.address?.thana) {
                targets.push(shop.address.thana.trim());
                targets.push(`THANA: ${shop.address.thana.trim()}`);
            }

            if (shop.parent_id) {
                const parent = await User.findById(shop.parent_id);
                if (parent && parent.role === 'DISTRIBUTOR') {
                    targets.push(parent.name.trim());
                    targets.push(`DIST: ${parent.name.trim()}`);
                } else if (parent && parent.role === 'SR' && parent.parent_id) {
                    const dist = await User.findById(parent.parent_id);
                    if (dist) {
                        targets.push(dist.name.trim());
                        targets.push(`DIST: ${dist.name.trim()}`);
                    }
                }
            }

            // 2. 🚀 BULLETPROOF MATRIX SEARCH (Ignores Case & Spaces)
            let matrixFee = null;
            if (targets.length > 0) {
                // Creates a flexible search query for every tag (e.g., searches for "dhaka" anywhere in the string, ignoring case)
                const orQueries = targets.map(t => ({
                    target_markets: { $regex: new RegExp(t, 'i') }
                }));

                matrixFee = await LicenseFee.findOne({
                    status: 'LIVE',
                    $or: orQueries
                }).sort({ createdAt: -1 });
            }

            // 3. If no custom rule matches this shop, BLOCK the activation
            if (!matrixFee) {
                console.log(`❌ Activation Blocked: No Matrix Fee found for Shop ${shop.name} in ${shop.address?.district}`);
                return res.status(403).json({
                    success: false,
                    message: `Activation Blocked: No Matrix Fee assigned for your region or distributor.`
                });
            }

            let fee = matrixFee.fee_amount;

            // 4. Proceed with deduction
            if (shop.balance < fee) return res.status(402).json({ success: false, message: `Shop balance low (Need: ৳${fee})` });

            shop.balance -= fee;
            await shop.save();

            await runCommissionEngine(shop, 'LICENSE');

            await new Transaction({
                userId: shop._id,
                amount: fee,
                type: 'LICENSE_ACTIVATION',
                status: 'SUCCESS',
                remarks: `Activated: ${device.customer_name} | IMEI: ${real_imei1} | Rule: ${matrixFee.fee_name || 'Custom Matrix'}`
            }).save();

            device.license_status = 'ACTIVATED';
            // 🚀 TRIGGER ACTIVITY LOG FOR SALES GENERATE
            await logActivity(
                shop, // The shopkeeper making the sale
                'SALE_GENERATE',
                device._id,
                `Activated License for ${device.customer_name}. Fee Deducted: ৳${fee}`,
                real_imei1
            );
        }
        else if (device.license_status === 'ACTIVATED' && device.imei !== real_imei1) {
            return res.status(403).json({ success: false, message: "Key bound to different hardware." });
        }

        device.real_imei1 = real_imei1;
        device.fcm_token = fcm_token;
        await device.save();

        res.status(200).json({
            success: true,
            next_due_date_ms: device.next_due_date ? new Date(device.next_due_date).getTime() : Date.now(),
            offline_otps: device.offline_otps,
            display_data: {
                customer: { user_id: device._id, name: device.customer_name, phone: device.customer_phone },
                owner: {
                    shop_name: device.shopkeeper_id?.name || "Lindux Soft Tech",
                    address: device.shopkeeper_id?.address?.district || "Bangladesh",
                    shop_phone: device.shopkeeper_id?.phone || "Support"
                }
            }
        });
    } catch (error) {
        console.error("Activation Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 4. Collect EMI Payment
export const collectEmi = async (req, res) => {
    try {
        const { deviceId, amountPaid } = req.body;
        const device = await Device.findById(deviceId);
        const received = Number(amountPaid);
        const tp = Number(device.total_price) || 0;
        const dp = Number(device.down_payment) || 0;
        const months = Number(device.installment_months) || 1;
        const trueBaseEmi = Math.round((tp - dp) / months);
        device.paid_so_far += received;
        device.payment_history.push({ date: new Date(), amount: received, remark: "EMI Paid" });
        let nextDue = device.next_due_date ? new Date(device.next_due_date) : new Date();
        if (received >= trueBaseEmi) { nextDue.setMonth(nextDue.getMonth() + 1); device.next_due_date = nextDue; }
        await device.save();
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
};

// 5. Extend Due Date & Remote Unlock
export const extendDueDate = async (req, res) => {
    try {
        const { deviceId, newDate } = req.body;
        const device = await Device.findById(deviceId);
        device.next_due_date = new Date(newDate);

        if (device.is_locked) {
            device.is_locked = false;
            if (device.fcm_token) {
                await admin.messaging().send({ token: device.fcm_token, data: { command: "unlock_device" }, android: { priority: "high" } });
            }
        }
        await device.save();

        // 🚀 TRIGGER ACTIVITY LOG FOR EMI EXTENSION
        await logActivity(
            req.user,
            'EMI_EXTENSION',
            device._id,
            `Extended EMI due date to ${new Date(newDate).toLocaleDateString()} for ${device.customer_name}`,
            device.imei
        );

        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
};

// 6. Manual Lock/Unlock Toggle
export const toggleDeviceLock = async (req, res) => {
    try {
        const { deviceId, action, reason } = req.body;
        const device = await Device.findById(deviceId).populate('shopkeeper_id');

        if (!device?.fcm_token) return res.status(400).json({ success: false, message: "Offline" });

        const commandToSend = action === 'BLOCK' ? "lock_device" : "unlock_device";
        await admin.messaging().send({
            token: device.fcm_token,
            data: {
                command: commandToSend,
                warning_message: action === 'BLOCK' ? reason : "Unlocked",
                shop_phone: device.shopkeeper_id?.phone || "Support"
            },
            android: { priority: "high" }
        });

        device.is_locked = (action === 'BLOCK');
        await device.save();

        // 🚀 TRIGGER ACTIVITY LOG
        await logActivity(
            req.user,
            action === 'BLOCK' ? 'LOCK_OVERRIDE' : 'UNLOCK_OVERRIDE',
            device._id,
            reason || (action === 'BLOCK' ? 'Device Locked' : 'Device Unlocked'),
            device.imei
        );

        res.status(200).json({ success: true });

    } catch (error) {
        // Convert the error object to a readable string
        const errorString = error.message || error.toString();

        // Log it to the Coolify console
        console.error(`❌ Toggle Lock Error: ${errorString}`);

        // Return it to the frontend so you can see it in your Network tab
        res.status(500).json({ success: false, error: errorString });
    }
};

// 7. Track Location
export const trackDevice = async (req, res) => {
    try {
        const { deviceId, reason } = req.body;
        const device = await Device.findById(deviceId);

        // 🚀 FIXED: Send a real error message back to the frontend!
        if (!device?.fcm_token) {
            return res.status(400).json({ success: false, message: "Device is OFFLINE or has no active connection token." });
        }

        await admin.messaging().send({ token: device.fcm_token, data: { command: "track_location", device_id: deviceId.toString(), reason: reason || "System Track" }, android: { priority: "high" } });

        // 🚀 TRIGGER ACTIVITY LOG
        await logActivity(
            req.user,
            'TRACK_DEVICE',
            device._id,
            `Tracked Device. Reason: ${reason || "System Track"}`,
            device.imei
        );

        res.status(200).json({ success: true, message: "Track command dispatched." });
    } catch (error) {
        // 🚀 FIXED: Print the exact reason Firebase failed to the console and frontend!
        console.error("🔥 Firebase Track Error:", error);
        res.status(500).json({ success: false, message: `Firebase failed: ${error.message}` });
    }
};

// 8. Update Location
export const updateDeviceLocation = async (req, res) => {
    try {
        const { deviceId, latitude, longitude } = req.body;
        await Device.findByIdAndUpdate(deviceId, { "diagnostics.last_location": { lat: latitude, lng: longitude, updatedAt: new Date() }, last_heartbeat: new Date() });
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
};

// 9. Heartbeat Sync
export const updateHeartbeat = async (req, res) => {
    try {
        const { deviceId, battery, signal } = req.body;
        await Device.findByIdAndUpdate(deviceId, { last_heartbeat: new Date(), "diagnostics.battery_level": battery, "diagnostics.signal_strength": signal });
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
};

// 10. Confirm Status from Device
export const confirmDeviceStatus = async (req, res) => {
    try {
        const { deviceId, status } = req.body;
        await Device.findByIdAndUpdate(deviceId, { is_locked: (status === 'LOCKED') });
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
};

// 11. Full Uninstall / Release (🚀 FIXED HANDSHAKE LOGIC)
export const uninstallDevice = async (req, res) => {
    try {
        const { deviceId } = req.body;
        const userRole = req.user?.role || req.body.role || 'SHOPKEEPER';
        const device = await Device.findById(deviceId);
        if (!device) return res.status(404).json({ success: false, message: "Device not found" });

        const isFullyPaid = (device.paid_so_far || 0) >= (device.total_price || 0);
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN') {
            if (!isFullyPaid) return res.status(403).json({ success: false, message: "Cannot uninstall: EMI is not fully paid yet." });
        }

        if (!device.fcm_token) return res.status(400).json({ success: false, message: "Device offline or has no token" });

        // 🚀 1. Send via FCM (Background Wakeup)
        await admin.messaging().send({ token: device.fcm_token, data: { command: "full_uninstall", device_id: deviceId.toString() }, android: { priority: "high" } });

        // 🚀 2. Send via Socket.io (Real-Time Active Connection Redundancy)
        const io = req.app.get('io');
        if (io) {
            io.emit("device_command", { deviceId: deviceId.toString(), command: "full_uninstall" });
        }

        device.is_locked = false;
        await device.save();

        // 🚀 TRIGGER ACTIVITY LOG
        await logActivity(
            req.user,
            'FULL_UNINSTALL',
            device._id,
            `Initiated Full Uninstall via Dashboard.`,
            device.imei
        );

        res.status(200).json({ success: true, message: "Uninstall command dispatched to device." });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 12. Confirm Status (🚀 FIXED FRONTEND SYNC LOGIC)
export const confirmUninstallStatus = async (req, res) => {
    try {
        const { deviceId } = req.body;
        await Device.findByIdAndUpdate(deviceId, { license_status: 'UNINSTALLED', is_locked: false });

        // 🚀 Broadcast to frontend dashboards to remove the device from active views instantly
        const io = req.app.get('io');
        if (io) {
            io.emit("device_uninstalled_success", { deviceId });
        }

        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
};

// 13. Global View
export const getAllDevices = async (req, res) => {
    try {
        const devices = await Device.find().populate('shopkeeper_id').sort({ createdAt: -1 });
        res.status(200).json({ success: true, devices });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
// 14. Push Silent App Update
export const pushAppUpdate = async (req, res) => {
    try {
        const { deviceId, apkUrl } = req.body;
        const device = await Device.findById(deviceId);

        if (!device?.fcm_token) {
            return res.status(400).json({ success: false, message: "Device is OFFLINE or has no active connection token." });
        }

        // Send the command via Firebase Admin SDK
        await admin.messaging().send({
            token: device.fcm_token,
            data: {
                command: "update_app",
                url: apkUrl || "https://server.trvnx.com/downloads/trvnx-v2.apk"
            },
            android: { priority: "high" }
        });

        // 🚀 TRIGGER ACTIVITY LOG
        await logActivity(
            req.user,
            'PUSH_UPDATE',
            device._id,
            `Pushed silent app update to device.`,
            device.imei
        );

        res.status(200).json({ success: true, message: "Update command dispatched successfully." });
    } catch (error) {
        console.error("🔥 Firebase Update Error:", error);
        res.status(500).json({ success: false, message: `Firebase failed: ${error.message}` });
    }
};
// 🚀 NEW: THE AUTOMATED LOCKING ENGINE
// This function scans for overdue payments and locks devices ONLY if auto_lock is TRUE
export const runAutomatedDueCheck = async (io) => {
    try {
        const now = new Date();

        // 1. Find devices: Past due date, NOT already locked, and AUTO_LOCK is enabled
        const overdueDevices = await Device.find({
            next_due_date: { $lt: now },
            is_locked: false,
            auto_lock: true, // 👈 THIS IS YOUR NEW FILTER
            license_status: 'ACTIVATED'
        }).populate('shopkeeper_id');

        console.log(`[CRON] Scanning for overdue... Found ${overdueDevices.length} targets.`);

        for (const device of overdueDevices) {
            if (device.fcm_token) {
                // 2. Send Lock Signal via Firebase
                await admin.messaging().send({
                    token: device.fcm_token,
                    data: {
                        command: "lock_device",
                        warning_message: "EMI Overdue: Please contact shop.",
                        shop_phone: device.shopkeeper_id?.phone || "Support"
                    },
                    android: { priority: "high" }
                });

                // 3. Update Database
                device.is_locked = true;
                await device.save();
                console.log(`[AUTO-LOCK] Locked device for ${device.customer_name} (Overdue)`);
            }
        }
    } catch (err) {
        console.error("Automated Lock Error:", err);
    }
};