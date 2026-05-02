import express from "express";
const router = express.Router();

// Maps to /api/settings/
router.get("/", (req,res)=>{
    res.status(200).json({success:true});
});

export default router;