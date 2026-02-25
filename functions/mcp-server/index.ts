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
    const embeddingsReady = await initializeEmbeddings(
      env.AUTO_GENERATE_EMBEDDINGS,
    );
    if (embeddingsReady) {
      this.logger.log("Semantic search enabled");
    } else {
      this.logger.log("Semantic search disabled (using substring search only)");
    }

    this.app.use(express.json());
    this.app.use("/mcp", new mcpServerRouter().router);
    this.app.listen(port, () => {
      this.logger.log(`Server is listening on port ${port}`);
    });
  }
}

let app = new App();
app.start();
