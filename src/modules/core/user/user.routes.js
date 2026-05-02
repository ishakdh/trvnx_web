import express from "express";
import UserController  from "./UserController.js";
const router = express.Router();

router.get("/all", UserController.index);
router.post("/create",UserController.store);

export default router;