import express from "express";
import { validationResult } from "express-validator";
import bodyParser from "body-parser";
import {
  createProject,
  deleteProject,
  forwardRequest,
  processNDJson
} from "./services";

import { Buffer } from "buffer";
import { validateCreateFhirProjectDto, validateDeleteFhirProjectDto, validateProxyDto } from "./middleware";

import { filterHeaders } from "../utils/types";

export class FhirRouter {
  public router = express.Router();
  private readonly logger = console;

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(bodyParser.json());
    //Endpoint to create a new project for the incoming dataset id in FHIR server
    this.router.post(
      "/createProject",
      validateCreateFhirProjectDto(),
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        const token = req.headers.authorization;
        const { id, description } = req.body;
        try {
          const status = await createProject(token, id, description);
          return res.status(200).json(status);
        } catch (error) {
          let log_msg = `Failed to create project in fhir server - ${error.message}`;
          this.logger.error(log_msg);
          res.status(500).send(log_msg);
        }
      }
    );

    this.router.all(
      "/project/:datasetToken/*",
      validateProxyDto(),
      async (req, res) => {
        // Examples
        // GET
        // get patient resource with id 123 - GET /Patient/:id
        // get patient with name == abc - GET /Patient?name=abc
        // get specific version of a resource i.e. vRead - GET /:resource/:resourceID/_history/:versionID

        // POST
        // create patient resource - POST /Patient
        // hard delete a patient resource, including resource history - POST /Patient/:id/$expunge (requires super admin)
        // get a bundle fhir - POST /
        // create a bundle - POST /

        // PUT
        // update patient resource - PUT /Patient/:id
        // upsert with search params i.e. conditional create - PUT /Patient?family=:family

        // PATCH
        // patch a patient resource - PATCH /Patient/:id, patch body: []

        // DELETE
        // delete a resource - DELETE /Observation/:id

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }

        try {
          const { "0": resourcePath, datasetToken } = req.params;
          const token = req.headers.authorization;
          const httpMethod = req.method;

          const queryParams = req.query ? req.query : {};
          const body = req.body ? req.body : {};

          const headers = req.headers
            ? filterHeaders(req.headers, false, httpMethod)
            : {};

          this.logger.info(
            `Received a '${httpMethod}' request for project named '${datasetToken}'`
          );

          // Forward request
          const fhirResponse = await forwardRequest(
            token,
            httpMethod,
            datasetToken,
            resourcePath,
            queryParams,
            body,
            headers
          );

          if (!fhirResponse) {
            res.status(502).send("No response from FHIR backend");
            return;
          }

          res
            .status(fhirResponse.status)
            .set(fhirResponse.headers)
            .send(fhirResponse.data);
        } catch (error) {
          let log_msg = `Failed to forward ${req.method} request - ${error.message}!`;
          this.logger.error(log_msg);
          res.status(500).send(log_msg);
        }

        // const { "0": resourcePath, studyCode } = req.params;
        // const token = req.headers.authorization;
        // const httpMethod = req.method;

        // const queryParams = req.query ? req.query : {};
        // const body = req.body ? req.body : {};

        // // check if incoming request is for Binary resource type
        // let resource;
        // resource = resourcePath ? resourcePath.split("/")[0] : "";
        // const isBinaryReq = resource === "Binary" ? true : false;

        // const headers = req.headers
        //   ? filterHeaders(req.headers, isBinaryReq, httpMethod)
        //   : {};

        // this.logger.info(
        //   `Received a '${httpMethod}' request for project named '${studyCode}'`
        // );

        // // Forward request
        // const fhirResponse = await forwardRequest(
        //   token,
        //   httpMethod,
        //   studyCode,
        //   resourcePath,
        //   queryParams,
        //   body,
        //   headers
        // );

        // if (isBinaryReq === true && httpMethod === HTTPMethod.GET) {
        //   res.set("Content-Type", fhirResponse.headers);
        //   res
        //     .status(fhirResponse.status)
        //     .set("Content-Type", fhirResponse.headers["content-type"])
        //     .set("Content-Disposition", "inline")
        //     .send(fhirResponse.data);
        // } else {
        //   res
        //     .status(fhirResponse.status)
        //     .set(fhirResponse.headers)
        //     .send(fhirResponse.data);
        // }
      }
    );

    //Endpoint to delete fhir project
    this.router.delete(
      "/deleteProject/:id",
      validateDeleteFhirProjectDto(),
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
          return;
        }
        const { id } = req.params;
        try {
          const token = req.headers.authorization;
          const response = await deleteProject(token, id);
          if (!response) {
            return res.status(502).send("No response from FHIR backend");
          }
          return res.status(response.status).json(response.data);
        } catch (error) {
          let log_msg = `Failed to delete project in fhir server`;
          this.logger.error(log_msg);
          res.status(500).send(log_msg);
        }
      }
    );
    //Expect as NDJSON body for bulk data import
    this.router.all(
      "/bulkImport/project/:datasetToken",
      bodyParser.text({ type: "application/ndjson" }),
      async (req, res) => {
        // Debug logging for NDJSON upload
        this.logger.info(
          `NDJSON upload: content-type='${req.headers["content-type"]}', typeof req.body='${typeof req.body}', isBuffer='${Buffer.isBuffer(req.body)}'`
        );
        if (Buffer.isBuffer(req.body)) {
          this.logger.warn("NDJSON body is a Buffer. Converting to string.");
          req.body = req.body.toString("utf8");
        }
        try {
          const { datasetToken } = req.params;
          const token = req.headers.authorization;
          const httpMethod = req.method;
          const ndjsonText = req.body;
          const headers = req.headers
            ? filterHeaders(req.headers, false, httpMethod)
            : {};

          this.logger.info(
            `Received a '${httpMethod}' request for project named '${datasetToken}'`
          );
          if(datasetToken === undefined || datasetToken.trim() === "") {
            res.status(400).send("Invalid dataset token");
            return;
          }
          if(ndjsonText === undefined || ndjsonText.trim() === "") {
            res.status(400).send("Empty NDJSON body");
            return;
          }
          // Forward request
          const fhirResponse = await processNDJson(
            ndjsonText,
            datasetToken,
            token,
            httpMethod,
            headers
          ) as { status: number; headers: any; data: any } | undefined;

          if (!fhirResponse || typeof fhirResponse !== "object" || !("status" in fhirResponse)) {
            res.status(502).send("No response from FHIR backend");
            return;
          }

          res
            .status(fhirResponse.status)
            .set(fhirResponse.headers)
            .send(fhirResponse.data);
        } catch (error) {
          let log_msg = `Failed to forward ${req.method} request - ${error.message}!`;
          this.logger.error(log_msg);
          res.status(500).send(log_msg);
        }
      }
    );
  }
}

