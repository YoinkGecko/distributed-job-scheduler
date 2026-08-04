import { Router } from "express";
import { createWorkflow } from "../controllers/workflow.controller.js";
import {addJobToWorkflow} from "../controllers/workflowJob.controller.js"
import {createDependencies} from "../controllers/workflowDependency.controller.js"
import {runWorkflow} from "../controllers/runWorkflow.controller.js"

const router = Router();

router.get("/test", (req, res) => {
  res.send("Workflow router");
});

router.post("/createWorkflow", createWorkflow);
router.post("/:workflowId/jobs", addJobToWorkflow);
router.post("/:workflowId/dependencies", createDependencies);
router.post("/:workflowId/run", runWorkflow);

export default router;
