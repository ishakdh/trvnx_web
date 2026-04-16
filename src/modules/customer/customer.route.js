import express from "express";
import {CustomerAuthController} from "./controller/CustomerAuthController.js";

const router = express.Router();

const authCtrl = new CustomerAuthController();

router.post("/create", authCtrl.register);
router.post("/login", authCtrl.login);

router.get("/test", authCtrl.test);
router.get("/check-license", authCtrl.checkLicense);

export default router;