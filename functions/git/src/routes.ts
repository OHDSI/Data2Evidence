import express, { Request, Response } from "express";

export default class GitRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.get("/", async (req: Request, res: Response) => {
      try {
        return res.status(200).send("Git function is up and running!");
      } catch (error: any) {
        return res.status(500).json({
          message: `An error occurred in the Git function ${error.message}`,
        });
      }
    });
  }
}
