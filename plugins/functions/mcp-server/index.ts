import "./setup.ts";

import express, { Application } from "express";
import { mcpServerRouter } from "./src/routes/routes";
import { initializeEmbeddings } from "./src/utils/embedding-helpers";
import { env } from "./src/env";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {
    const port = 10000;

    // Initialize embeddings on startup
    await initializeEmbeddings(env.MCP_GENERATE_EMBEDDINGS);

    // A tools/call body is model-generated and usually small, but not bounded:
    // create_concept_set / build_d2e_cohort_deeplink can carry long concept and
    // clause lists. express.json()'s 100kb default answers those with a 413 whose
    // HTML body reaches the caller as the "tool result" — the same failure the
    // cohort agent hit on its own transcript. Match the limit the other d2e
    // functions use.
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use("/mcp", new mcpServerRouter().router);
    this.app.listen(port, () => {
      this.logger.log(`Server is listening on port ${port}`);
    });
  }
}

let app = new App();
app.start();
