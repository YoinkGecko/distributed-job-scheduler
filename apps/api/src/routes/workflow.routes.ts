import { Router } from "express";
import { createWorkflow } from "../controllers/workflow.controller.js";
import {addJobToWorkflow} from "../controllers/workflowJob.controller.js"


const router = Router();

router.get("/test", (req, res) => {
  res.send("Workflow router");
});

router.post("/createWorkflow", createWorkflow);
router.post("/:workflowId/jobs", addJobToWorkflow);

export default router;
