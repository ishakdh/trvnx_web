import Device from '../models/Device.js';

export const registerOrUpdateDevice = async (req, res) => {
    try {
        const { deviceId, model, battery } = req.body;

        const device = await Device.findOneAndUpdate(
            { deviceId },
            { model, battery, lastSeen: Date.now(), status: "Online" },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, device });
    } catch (error) {
        res.status(500).json({ message: "Agent Link Failed" });
    }
};

export const getDevices = async (req, res) => {
    try {
        const devices = await Device.find();
        res.status(200).json(devices);
    } catch (error) {
        res.status(500).json({ message: "Unable to fetch device grid" });
    }
};