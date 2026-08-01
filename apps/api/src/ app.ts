import express from "express";
import jobRoutes from "./routes/job.routes.js";
import workflowRoutes from "./routes/workflow.routes.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "api"
    });
});

app.use("/jobs", jobRoutes);
app.use("/workflow", workflowRoutes);

export default app;