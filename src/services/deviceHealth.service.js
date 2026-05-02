export const calculateDeviceStatus = (lastHeartbeat) => {
    const diffInHours = (new Date() - new Date(lastHeartbeat)) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'GREEN';
    if (diffInHours < 28) return 'YELLOW';
    return 'RED';
};