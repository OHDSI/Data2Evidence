import express, { Request, Response } from "express";
import { validationResult } from "express-validator";
import {
  FhirServerAPI,
  IFhirApiResponse,
  IFhirCreatedDataset,
  IFhirDatasetSummary,
} from "./FhirServerAPI";
import { filterHeaders, HTTPMethod } from "./types";
import {
  validateCreateFhirProjectDto,
  validateDeleteFhirProjectDto,
  validateProxyDto,
} from "./middleware";

export class FhirRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.get("/healthcheck", async (req: Request, res: Response) => {
      const token = req.headers.authorization;
      try {
        const fhirServerAPI = new FhirServerAPI(token!);
        const response: any = await fhirServerAPI.fhirServerHealthCheck();
        return res.status(response.status).json(response.data);
      } catch (error: any) {
        const errorMessage = error.response?.data || error.message;
        console.error(`Error fetching health check: ${errorMessage}`);
        res.status(500).json({
          error: true,
          message: `Error fetching health check: ${errorMessage}`,
        });
      }
    });

    this.router.get("/datasets/list", async (req: Request, res: Response) => {
      const token = req.headers.authorization;
      try {
        const fhirServerAPI = new FhirServerAPI(token!);
        const response: IFhirApiResponse<IFhirDatasetSummary[]> =
          await fhirServerAPI.getDatasets();
        return res.status(response.status).json(response.data);
      } catch (error: any) {
        const errorMessage = error.response?.data || error.message;
        console.error(`Error fetching datasets: ${errorMessage}`);
        res.status(500).json({
          error: true,
          message: `Error fetching datasets: ${errorMessage}`,
        });
      }
    });

    this.router.post(
      "/createProject",
      validateCreateFhirProjectDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const token = req.headers.authorization;
        const { id, name } = req.body ?? {};

        try {
          const fhirServerAPI = new FhirServerAPI(token!);
          const response: IFhirApiResponse<
            IFhirCreatedDataset | Record<string, unknown>
          > = await fhirServerAPI.createFhirDataset({ id, name });
          return res.status(response.status).json(response.data);
        } catch (error: any) {
          const errorMessage = error.response?.data || error.message;
          console.error(`Error creating project: ${errorMessage}`);
          res.status(500).json({
            error: true,
            message: `Error creating project: ${errorMessage}`,
          });
        }
      },
    );

    this.router.delete(
      "/deleteProject/:id",
      validateDeleteFhirProjectDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const token = req.headers.authorization;
        const id = req.params.id as string | undefined;

        try {
          const fhirServerAPI = new FhirServerAPI(token!);
          const response = await fhirServerAPI.deleteFhirDataset(id);
          return res.status(response.status).json(response.data);
        } catch (error: any) {
          const errorMessage = error.response?.data || error.message;
          console.error(`Error deleting project: ${errorMessage}`);
          res.status(500).json({
            error: true,
            message: `Error deleting project: ${errorMessage}`,
          });
        }
      },
    );

    this.router.post("/project/:id", async (req: Request, res: Response) => {
      // this endpoint should only allow posting of bundles
      const token = req.headers.authorization;
      const { id } = req.params;
      const bundle = req.body;

      if (!bundle) {
        return res.status(400).json({
          error: true,
          message: "Missing required FHIR bundle in body",
        });
      }

      if (typeof bundle !== "object" || bundle.resourceType !== "Bundle") {
        return res.status(400).json({
          error: true,
          message: "Request body must be a FHIR Bundle",
        });
      }

      if (bundle.type !== "transaction" && bundle.type !== "batch") {
        return res.status(400).json({
          error: true,
          message: 'FHIR Bundle type must be either "transaction" or "batch"',
        });
      }

      try {
        const fhirServerAPI = new FhirServerAPI(token!);
        const response = await fhirServerAPI.postBundle(id, bundle);
        return res.status(response.status).json(response.data);
      } catch (error: any) {
        const errorMessage = error.response?.data || error.message;
        console.error(`Error posting bundle: ${errorMessage}`);
        res.status(500).json({
          error: true,
          message: `Error posting bundle: ${errorMessage}`,
        });
      }
    });

    this.router.all(
      "/project/:id/*",
      validateProxyDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const token = req.headers.authorization;
        const { "0": resourcePath, id } = req.params;
        const method = req.method?.toUpperCase();
        const httpMethod =
          method in HTTPMethod
            ? HTTPMethod[method as keyof typeof HTTPMethod]
            : undefined;

        if (!httpMethod) {
          return res.status(405).json({
            error: true,
            message: `Unsupported HTTP method: ${req.method}`,
          });
        }
        const queryParams = req.query ? req.query : {};
        const body = req.body ? req.body : {};

        // check if incoming request is for Binary resource type
        const resourceType = resourcePath ? resourcePath.split("/")[0] : "";
        const isBinaryReq = resourceType === "Binary" ? true : false;

        if (isBinaryReq) {
          const errorMsg =
            "Binary resource type is not supported in this endpoint.";
          console.error(`Error: ${errorMsg}`);
          return res.status(400).json({
            error: true,
            message: errorMsg,
          });
        }

        const headers = req.headers
          ? filterHeaders(req.headers, isBinaryReq, httpMethod)
          : {};

        try {
          const fhirServerAPI = new FhirServerAPI(token!);
          const response = await fhirServerAPI.forwardRequest(
            id,
            httpMethod,
            resourcePath,
            queryParams,
            body,
            headers,
          );
          return res.status(response.status).json(response.data);
        } catch (error: any) {
          const errorMessage = error.response?.data || error.message;
          console.error(`Error forwarding request: ${errorMessage}`);
          res.status(500).json({
            error: true,
            message: `Error forwarding request: ${errorMessage}`,
          });
        }
      },
    );
  }
}
