import { Request, Response } from "express";

export async function createWorkflow(req: Request, res: Response) {
  res.send("create workflow");
}
