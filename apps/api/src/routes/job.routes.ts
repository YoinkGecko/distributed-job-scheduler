import { Router } from "express";
import {createJob} from '../controllers/job.controller.js'

const router = Router();
router.post("/", createJob);

export default router;