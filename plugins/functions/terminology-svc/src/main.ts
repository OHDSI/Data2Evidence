// @ts-types="npm:@types/express"
import express, { NextFunction, Response, Request } from "express";
import { z } from "zod";
import "./env.ts"; // Ensure env var validation is done on start
import { router } from "./routes.ts";

const main = () => {
  const app = express();
  app.use(express.json());

  app.use(router);

  app.use((e: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (e instanceof z.ZodError) {
      res.status(400).json(e.issues);
      return;
    }
    console.error(e.stack);
    res.status(500).json({ error: "Internal Server Error" });
  });

  const port = 3000;

  app.listen(port, () => {
    console.log(`Terminology service is running at http://localhost:${port}`);
  });
};

main();
