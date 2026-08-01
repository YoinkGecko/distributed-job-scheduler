import { Router } from "express";

const router = Router();
router.get("/test",(req,res)=>{
    res.send("Workflow router");
});

export default router;