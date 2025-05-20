import { getDataMapping } from "./services";
import express, { Request, Response } from "express";

export class DataMappingRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/", async (req: Request, res: Response) => {
      try {
        const modelResponse = await getDataMapping(req.body);
        res.status(200).json(modelResponse);
      } catch (error) {
        res.status(error.code).json({
          error: true,
          message: error.message,
          details: error.name,
        });
      }
    });
  }
}
