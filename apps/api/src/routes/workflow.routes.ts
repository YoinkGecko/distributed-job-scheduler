import { Router } from "express";
import {createWorkflow} from "../controllers/workflow.controller.js";

const router = Router();
router.get("/test",(req,res)=>{
    res.send("Workflow router");
});

router.post("/createWorkflow",createWorkflow);

export default router;