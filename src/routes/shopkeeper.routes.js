import express from "express";
import { receiveEMI, searchCustomer } from "../controllers/shopkeeper.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Option 08: Receive EMI Workflow
router.get("/search-customer", protect, searchCustomer);
router.post("/receive-emi", protect, receiveEMI);

export default router;