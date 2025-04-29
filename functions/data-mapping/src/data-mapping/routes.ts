import { getDataMapping } from "./services";
import express, { Request, Response } from "express";
// import { env } from "../env";

// const AI_MODEL = env.AI_MODEL;
export class DataMappingRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/", async (req: Request, res: Response) => {
      // req.body.model = AI_MODEL;
      let [rst, status] = await getDataMapping(req.body);
      // LLM model
      if (status === "200") {
        res.status(200).json(rst);
      }
      // Internal Server Error
      else if (status === "500") {
        res.status(500).json({
          error: true,
          message: "Cannot map data",
          details: rst,
        });
      }
    });
  }
}
