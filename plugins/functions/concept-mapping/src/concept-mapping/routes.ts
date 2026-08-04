import express, { Request, Response } from "express";
import { validationResult, matchedData } from "express-validator";
import {
  getSourceToConceptMappings,
  saveSourceToConceptMappings,
  resolveCacheId,
  CacheIdResolutionError,
  EmptyMappingsError,
  DatasetFetcher,
} from "./services";
import { GetConceptMappingDto, ConceptMappingDto } from "./middleware";

/**
 * Builds a dataset lookup bound to the caller's token. Injected so the router
 * stays importable (and testable) without the env-dependent PortalAPI module.
 */
export type DatasetFetcherFactory = (token: string) => DatasetFetcher;

export class ConceptMappingRouter {
  public router = express.Router();
  private readonly logger = console;

  constructor(private readonly datasetFetcherFactory?: DatasetFetcherFactory) {
    this.registerRoutes();
  }

  private fetcherFor(req: Request): DatasetFetcher | undefined {
    if (!this.datasetFetcherFactory) return undefined;
    return this.datasetFetcherFactory(req.headers.authorization ?? "");
  }

  private registerRoutes() {
    this.router.get(
      "/",
      GetConceptMappingDto(),
      async (req: Request, res: Response) => {
        this.logger.log("retrieve concept mapping");

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        try {
          const { databaseCode, schemaName, datasetId } = matchedData(req, {
            locations: ["query"],
          });

          const cacheId = await resolveCacheId(
            databaseCode,
            datasetId,
            this.fetcherFor(req),
          );

          const response = await getSourceToConceptMappings(
            cacheId,
            schemaName,
          );
          res.status(200).json(response);
        } catch (error) {
          if (error instanceof CacheIdResolutionError) {
            console.error(error);
            return res.status(502).send("Failed to resolve dataset cache id");
          }
          console.error(error);
          res.status(500).send("Failed to retrieve concept mappings");
        }
      },
    );

    this.router.post(
      "/",
      ConceptMappingDto(),
      async (req: Request, res: Response) => {
        this.logger.log("save concept mappings");

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        try {
          const { databaseCode, schemaName, datasetId } = matchedData(req, {
            locations: ["query"],
          });
          const { conceptMappings, sourceVocabularyId } = matchedData(req, {
            locations: ["body"],
          });

          const fetchDataset = this.fetcherFor(req);
          const rows = await saveSourceToConceptMappings(
            () => resolveCacheId(databaseCode, datasetId, fetchDataset),
            schemaName,
            sourceVocabularyId,
            conceptMappings,
          );

          res.status(200).send(`Inserted ${rows} rows to ${databaseCode}`);
        } catch (error) {
          if (error instanceof EmptyMappingsError) {
            return res.status(400).send("No concept mappings to save");
          }
          if (error instanceof CacheIdResolutionError) {
            console.error(error);
            return res.status(502).send("Failed to resolve dataset cache id");
          }
          console.error(error);
          res.status(500).send("Failed to save concept mappings");
        }
      },
    );
  }
}
