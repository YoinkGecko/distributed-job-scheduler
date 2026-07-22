import { Request, Response } from "express";

export async function createJob(_req: Request, res: Response) {
    return res.status(200).json({
        message: "Controller reached",
    });
}