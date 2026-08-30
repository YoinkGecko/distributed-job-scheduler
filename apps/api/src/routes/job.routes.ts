import { Router } from "express";
import {createJob,getJobs,getJob,getJobMetrics} from '../controllers/job.controller.js'

const router = Router();
router.get("/metrics", getJobMetrics);
router.post("/", createJob);
router.get("/",getJobs);
router.get("/:jobId",getJob);


export default router;