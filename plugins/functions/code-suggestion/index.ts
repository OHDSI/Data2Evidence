import express, { Application } from "express";
import { CodeSuggestionRouter } from "./src/code-suggestion/routes";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {
    // /agent is stateless by design: every turn carries the WHOLE transcript,
    // including each tool call's input and output. A single pa_list_filter_options
    // result on an OMOP dataset is tens of KB, so a few turns blow past
    // express.json()'s 100kb default — which answers with a 413 whose HTML body
    // then surfaced verbatim in the assistant drawer. Match the limit every other
    // d2e function uses.
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use("/code-suggestion", new CodeSuggestionRouter().router);
    this.app.listen(10000);
  }
}

let app = new App();
app.start();

