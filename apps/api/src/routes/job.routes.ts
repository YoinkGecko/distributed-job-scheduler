import { Router } from "express";

const router = Router();

router.post("/", (_req, res) => {
    res.json({
        message: "Create Job Endpoint"
    });
});

export default router;