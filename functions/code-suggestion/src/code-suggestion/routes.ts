import { getCodeSuggestion } from "./services";
import express, { Request, Response } from "express";
import { env } from "../env";

const AI_MODEL = env.AI_MODEL;
export class CodeSuggestionRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/", async (req: Request, res: Response) => {
      req.body.model = AI_MODEL;
      let [code_rst, status] = await getCodeSuggestion(req.body);
      if (status === "500") {
        res.status(200).json({
          error: true,
          message: "Cannot fetch code suggestion",
          details: code_rst,
        });
      } else if (status === "200") {
        res.status(200).json(code_rst);
      }
    });
  }
}
