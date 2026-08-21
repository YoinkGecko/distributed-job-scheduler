import { Router } from "express";
import { createWorkflow } from "../controllers/workflow.controller.js";
import {addJobToWorkflow,getWorkflowJobs} from "../controllers/workflowJob.controller.js"
import {createDependencies} from "../controllers/workflowDependency.controller.js"
import {runWorkflow} from "../controllers/runWorkflow.controller.js"
import {getWorkflows,getWorkflow} from "../controllers/workflow.controller.js"

const router = Router();

router.get("/test", (req, res) => {
  res.send("Workflow router");
});

router.get("/",getWorkflows);
router.get("/:workflowId",getWorkflow);
router.get("/:workflowId/jobs",getWorkflowJobs);
//router.get("/:workflowId/dependencies", getDependencies);

router.post("/createWorkflow", createWorkflow);
router.post("/:workflowId/jobs", addJobToWorkflow);
router.post("/:workflowId/dependencies", createDependencies);
router.post("/:workflowId/run", runWorkflow);


export default router;
