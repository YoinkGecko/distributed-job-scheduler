import express from "express";
import jobRoutes from "./routes/job.routes.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "api"
    });
});

app.use("/jobs", jobRoutes);

export default app;