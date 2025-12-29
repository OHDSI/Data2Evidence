import express from "express";
import { validationResult } from "express-validator";
import {
  createProject,
  deleteProject,
  forwardRequest
} from "./services";

import { validateCreateFhirProjectDto, validateDeleteFhirProjectDto, validateProxyDto } from "./middleware";

import { filterHeaders, HTTPMethod } from "../utils/types";

export class FhirRouter {
  public router = express.Router();
  private readonly logger = console;

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    // Use raw body parser for large/binary requests
    this.router.use(express.raw({ type: '*/*', limit: '100mb' }));
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
      "/project/:projectName/*",
      validateProxyDto(),
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
          return;
        }
        try {
          const { "0": resourcePath, projectName } = req.params;
          const token = req.headers.authorization;
          const httpMethod = req.method;

          const queryParams = req.query ? req.query : {};
          const body = req.body ? req.body : {};

          // check if incoming request is for Binary resource type
          let resource;
          resource = resourcePath ? resourcePath.split("/")[0] : "";
          const isBinaryReq = resource === "Binary" ? true : false;

          const headers = req.headers
            ? filterHeaders(req.headers, isBinaryReq, httpMethod)
            : {};

          this.logger.info(
            `Received a '${httpMethod}' request for project named '${projectName}'`
          );

          // Forward request
          const fhirResponse = await forwardRequest(
            token,
            httpMethod,
            projectName,
            resourcePath,
            queryParams,
            body,
            headers
          );

          if (!fhirResponse) {
            let log_msg = `No response received from FHIR server.`;
            this.logger.error(log_msg);
            return res.status(500).send(log_msg);
          }

          if (isBinaryReq === true && httpMethod === HTTPMethod.GET) {
            res.set("Content-Type", fhirResponse.headers);
            res
              .status(fhirResponse.status)
              .set("Content-Type", fhirResponse.headers["content-type"])
              .set("Content-Disposition", "inline")
              .send(fhirResponse.data);
          } else {
            res
              .status(fhirResponse.status)
              .set(fhirResponse.headers)
              .send(fhirResponse.data);
          }
        } catch (error) {
          let log_msg = `Failed to forward ${req.method} request - ${error.message}!`;
          this.logger.error(log_msg);
          res.status(500).send(log_msg);
        }
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
          return res.status(response.status).json(response.data);
        } catch (error) {
          let log_msg = `Failed to delete project in fhir server`;
          this.logger.error(log_msg);
          res.status(500).send(log_msg);
        }
      }
    );
  }
}
