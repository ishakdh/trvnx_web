import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema({
    agent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The Shopkeeper or Customer
    target_imei: String,

    // Option 05: Call Reason & Support matching
    call_type: { type: String, enum: ['INCOMING', 'OUTGOING'] },
    reason_for_call: { type: String, required: true },
    support_provided: String,

    status: { type: String, enum: ['OPEN', 'RESOLVED', 'ESCALATED'], default: 'OPEN' }
}, { timestamps: true });

export default mongoose.model("SupportTicket", supportTicketSchema);