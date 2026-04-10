import express, { Request, Response } from "express";
import { validationResult } from "express-validator";

import {
  createFhirDataset,
  deleteFhirDataset,
  getFhirDatasets,
  ingestBundle,
  checkFhirServerHealth,
  forwardFhirRequest,
} from "./services";
import {
  validateCreateFhirDatasetDto,
  validateDeleteFhirDatasetDto,
  validateProxyDto,
  validateBundle,
} from "./middleware";

export class FhirRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.get("/healthcheck", async (req: Request, res: Response) => {
      try {
        const token = req.headers.authorization;
        const response = await checkFhirServerHealth(token);
        return res.status(200).json(response);
      } catch (error: any) {
        return res.status(500).json({
          connected: false,
          healthy: false,
        });
      }
    });

    this.router.get("/datasets/list", async (req: Request, res: Response) => {
      const token = req.headers.authorization;
      try {
        const response = await getFhirDatasets(token);
        return res.status(200).json(response);
      } catch (error: any) {
        console.error(`Error fetching datasets:`, error);
        res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    });

    this.router.post(
      "/createDataset",
      validateCreateFhirDatasetDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const token = req.headers.authorization;

        try {
          const result = await createFhirDataset(req.body, token);
          return res.status(200).json({
            error: false,
            message: `FHIR dataset with id ${req.body.id} created successfully`,
          });
        } catch (error: any) {
          console.error(`Error creating FHIR dataset:`, error);
          return res.status(500).json({
            error: true,
            message: error.message,
          });
        }
      },
    );

    this.router.delete(
      "/deleteDataset/:id",
      validateDeleteFhirDatasetDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const datasetId = req.params.id;
        const token = req.headers.authorization;

        try {
          await deleteFhirDataset(datasetId, token);
          // FHIR server returns 204 No Content on successful delete
          return res.status(204).send();
        } catch (error: any) {
          console.error(`Error deleting FHIR dataset:`, error);
          return res.status(500).json({
            error: true,
            message: error.message,
          });
        }
      },
    );

    this.router.post(
      "/dataset/:id",
      validateBundle(),
      async (req: Request, res: Response) => {
        // this endpoint should only allow posting of bundles
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const token = req.headers.authorization;
        const { id } = req.params;
        const bundle = req.body;

        try {
          const response = await ingestBundle(id, bundle, token);
          return res.status(response.status).json(response.data);
        } catch (error: any) {
          console.error(`Error posting bundle:`, error);
          res.status(500).json({
            error: true,
            message: error.message,
          });
        }
      },
    );

    this.router.all(
      "/dataset/:id/*",
      validateProxyDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const token = req.headers.authorization;
        const { "0": resourcePath, id } = req.params;
        const method = req.method;
        const queryParams = req.query ? req.query : {};
        const body = req.body ? req.body : {};

        try {
          const response = await forwardFhirRequest(
            id,
            method,
            resourcePath,
            queryParams,
            body,
            req.headers,
            token,
          );
          return res.status(response.status).json(response.data);
        } catch (error: any) {
          console.error(`Error forwarding request:`, error);
          res.status(500).json({
            error: true,
            message: error.message,
          });
        }
      },
    );
  }
}
