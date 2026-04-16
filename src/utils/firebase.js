import admin from "firebase-admin";

export const sendFCMCommand = async (token, payload) => {
    try {
        if (!token) {
            console.log("[FCM WARNING] Cannot send command: No FCM token provided.");
            return false;
        }

        // We map the payload into a "data" message so the Android App can read it silently in the background
        const message = {
            data: {
                command: payload.action || "UNKNOWN", // e.g., "LOCK_DEVICE" or "UNLOCK_DEVICE"
                message: payload.message || "",
                title: payload.title || "TRVNX Alert",
                body: payload.body || ""
            },
            token: token
        };

        const response = await admin.messaging().send(message);
        return response;

    } catch (error) {
        console.error("[FCM ERROR] Failed to send push notification:", error.message);
        return false;
    }
};