import express, { Application } from "express";
import { CodeSuggestionRouter } from "./src/code-suggestion/routes";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {
    this.app.use(express.json());
    this.app.use("/code-suggestion", new CodeSuggestionRouter().router);
    this.app.listen(10000);
  }
}

let app = new App();
app.start();

