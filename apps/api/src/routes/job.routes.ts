import { Router } from "express";
import {createJob,getJobs,getJob} from '../controllers/job.controller.js'

const router = Router();
router.post("/", createJob);
router.get("/",getJobs);
router.get("/:jobId",getJob);

export default router;