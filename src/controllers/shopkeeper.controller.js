import Sale from "../models/Sale.js";

// Option 08: Search for Receive EMI
export const searchCustomer = async (req, res) => {
    const { query } = req.query;
    try {
        const results = await Sale.find({
            shopkeeper_id: req.user._id,
            $or: [
                { customer_phone: new RegExp(query, 'i') },
                { customer_name: new RegExp(query, 'i') }
            ]
        });
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Option 08: Process Received EMI Payment
export const receiveEMI = async (req, res) => {
    const { saleId, amount, paymentType } = req.body;

    try {
        const sale = await Sale.findById(saleId);
        if (!sale) return res.status(404).json({ message: "Customer/Sale not found" });

        sale.total_paid = (sale.total_paid || 0) + Number(amount);
        const remainingBalance = sale.total_price - sale.down_payment - sale.total_paid;

        if (paymentType === 'FULL_PAY' || remainingBalance <= 0) {
            sale.payment_status = 'FULL_PAID';
            sale.pending_command = 'FULL_UNINSTALL';
            sale.next_emi_date = null; // No more payments due
        } else {
            sale.payment_status = 'UP_TO_DATE';
            sale.pending_command = 'UNLOCK';

            // Move next due date forward by 1 month
            let currentDue = new Date(sale.next_emi_date);
            currentDue.setMonth(currentDue.getMonth() + 1);
            sale.next_emi_date = currentDue;
        }

        await sale.save();

        // Push real-time command if device is online
        const socketId = global.activeDevices.get(sale.imei1);
        if (socketId) {
            global.io.to(socketId).emit("command_received", {
                action: sale.pending_command,
                reason: "Payment Received"
            });
        }

        res.json({
            message: `EMI Received. Status: ${sale.payment_status}`,
            next_due: sale.next_emi_date,
            remaining: remainingBalance > 0 ? remainingBalance : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Option 03: Live Device Monitoring
export const getLiveDevices = async (req, res) => {
    try {
        const devices = await Sale.find({ shopkeeper_id: req.user._id, status: 'ACTIVATED' });
        res.json(devices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};