import express, { Request, Response } from "express";
import { validationResult, matchedData } from "express-validator";
import {
  getSourceToConceptMappings,
  saveSourceToConceptMappings,
} from "./services";
import { GetConceptMappingDto, ConceptMappingDto } from "./middleware";

export class ConceptMappingRouter {
  public router = express.Router();
  private readonly logger = console;

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.get(
      "/",
      GetConceptMappingDto(),
      async (req: Request, res: Response) => {
        this.logger.log("retrieve concept mapping");

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }

        try {
          const user = req.headers["authorization"]!;
          const { datasetId } = matchedData(req, {
            locations: ["query"],
          });

          const response = await getSourceToConceptMappings(user, datasetId);
          res.status(200).json(response);
        } catch (error) {
          res.status(500).send(error);
        }
      }
    );

    this.router.post(
      "/",
      ConceptMappingDto(),
      async (req: Request, res: Response) => {
        this.logger.log("save concept mappings");

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }

        try {
          const user = req.headers["authorization"]!;
          const { datasetId, dialect } = matchedData(req, {
            locations: ["query"],
          });
          const { conceptMappings, sourceVocabularyId } = matchedData(req, {
            locations: ["body"],
          });

          const rows = await saveSourceToConceptMappings(
            user,
            datasetId,
            dialect,
            sourceVocabularyId,
            conceptMappings
          );

          res
            .status(200)
            .send(`Inserted ${rows} rows to ${dialect}|${datasetId}`);
        } catch (error) {
          res.status(500).send(error);
        }
      }
    );
  }
}
