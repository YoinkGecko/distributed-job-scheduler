import { Router } from "express";
import {createJob,getJobs,getJob,getJobMetrics} from '../controllers/job.controller.js'

const router = Router();
router.post("/", createJob);
router.get("/",getJobs);
router.get("/:jobId",getJob);
router.get("/metrics", getJobMetrics);


export default router;