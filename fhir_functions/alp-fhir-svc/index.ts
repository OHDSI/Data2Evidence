import express, { Application } from "npm:express";
import { FhirRouter } from "./src/fhir-svc/routes.ts";
import { binaryUploadLimitSize } from "./src/env.ts";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {

    // set limit size for bundles
    this.app.use(express.json({ limit: binaryUploadLimitSize }));


    // Handle raw binary data (for file uploads, etc.)
    this.app.use(
      express.raw({
        //type: '*/*',
        type: (req) => {
          const contentType = req.headers["content-type"];
          // accept only MIME types with application/* or image/*
          const mimeTypeRegex = /^(application\/.*|image\/.*)$/;
          return mimeTypeRegex.test(contentType);
        },
        limit: binaryUploadLimitSize,
      })
    );

    this.app.use((err, req, res, next) => {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).send("File size exceeds the limit");
      }
      if (err instanceof Error && err.message === "request entity too large") {
        return res.status(413).send("Request body too large");
      }
      next(err);
    });

    this.app.use("/gateway/api/fhir", new FhirRouter().router);
    this.app.listen(8000);
    this.logger.info(`🚀 ALP FHIR Service started successfully!`);
  }
}
let app = new App();
app.start();
