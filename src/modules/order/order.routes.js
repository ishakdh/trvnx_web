import express from "express";
import {OrderController} from "./controller/OrderController.js";

const router = express.Router();

const authCtrl = new OrderController();

router.post("/create", authCtrl.create);

router.get("/test", authCtrl.test);

export default router;