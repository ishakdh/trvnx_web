// Rule: 10-sale limit for Trial IDs
exports.checkTrialLimit = (req, res, next) => {
    if (req.user.kyc_status === 'TRIAL' && req.user.trial_sales_count >= 10) {
        return res.status(403).json({ message: "Trial limit reached. Pending Admin Approval." });
    }
    next();
};

// Rule: Disable manual lock if a dispute is active
exports.checkDisputeLock = (req, res, next) => {
    if (req.device.dispute_flag) {
        return res.status(403).json({ message: "Manual lock disabled due to active dispute." });
    }
    next();
};