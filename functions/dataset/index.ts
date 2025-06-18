import express, { Request, Response } from "npm:express";
import { v4 as uuidv4 } from "npm:uuid";
import { AnalyticsSvcAPI } from "./api/AnalyticsSvcAPI.ts";
import { JobPluginsAPI } from "./api/JobpluginsAPI.ts";
import { PortalAPI } from "./api/PortalAPI.ts";
import { CDMSchemaTypes, DbDialect } from "./const.ts";
import { env } from "./env.ts";
import { generateDatasetSchema } from "./GenerateDatasetSchema.ts";

const GATEWAY_WO_PROTOCOL_FQDN = env.GATEWAY_WO_PROTOCOL_FQDN!;
const app = express();

export class DatasetRouter {
  public router = express.Router();
  private readonly logger = console;

  constructor() {
    this.registerRoutes();
  }

  private schemaCase(schemaName: string, dialect: DbDialect) {
    switch (dialect) {
      case DbDialect.Hana:
        return schemaName.toUpperCase();
      case DbDialect.Postgres:
        return schemaName.toLowerCase();
      default:
        return schemaName;
    }
  }

  private flowSnapshotType(snapshotLocation: string) {
    if (snapshotLocation === "DB") {
      return "create_snapshot";
    } else {
      return "create_parquet_snapshot";
    }
  }

  private registerRoutes() {
    this.router.get(
      "/cdm-schema/snapshot/metadata",
      async (req: Request, res: Response) => {
        const { datasetId } = req.query || {};

        if (!datasetId) {
          return res.status(400).send(`datasetId is required`);
        } else if (typeof datasetId !== "string") {
          return res.status(400).send(`datasetId query param is invalid`);
        }

        const token = req.headers.authorization!;
        const analyticsSvcAPI = new AnalyticsSvcAPI(token);

        try {
          const metadata = await analyticsSvcAPI.getCdmSchemaSnapshotMetadata(
            datasetId
          );
          return res.status(200).json(metadata);
        } catch (error) {
          this.logger.error(
            `Error when getting CDM schema snapshot metadata: ${JSON.stringify(
              error
            )}`
          );
          res
            .status(500)
            .send("Error when getting CDM schema snapshot metadata");
        }
      }
    );

    this.router.get("/cohorts", async (req: Request, res: Response) => {
      const { datasetId } = req.query || {};

      if (!datasetId) {
        return res.status(400).send(`datasetId is required`);
      } else if (typeof datasetId !== "string") {
        return res.status(400).send(`datasetId query param is invalid`);
      }

      try {
        const analyticsSvcAPI = new AnalyticsSvcAPI(req.headers.authorization!);
        const result = await analyticsSvcAPI.getAllCohorts(datasetId);
        return res.status(200).json(result);
      } catch (error) {
        this.logger.error(
          `Error when getting cohorts: ${JSON.stringify(error)}`
        );
        res.status(500).send("Error when getting cohorts");
      }
    });

    this.router.post(
      "/",
      generateDatasetSchema,
      async (req: Request, res: Response) => {
        const token = req.headers.authorization!;
        const portalAPI = new PortalAPI(token);
        const jobpluginsAPI = new JobPluginsAPI(token);

        const id = uuidv4();
        const {
          type,
          tokenStudyCode,
          tenantId,
          schemaOption,
          vocabSchemaValue,
          cleansedSchemaOption,
          dialect,
          databaseCode,
          schemaName,
          dataModel,
          plugin,
          paConfigId,
          visibilityStatus,
          detail,
          dashboards,
          attributes,
          tags,
          fhirProjectId,
        } = req.body;

        // Token study code validation
        const tokenFormat = /^[a-zA-Z0-9_]{1,80}$/;
        if (!tokenStudyCode.match(tokenFormat)) {
          this.logger.error(
            `Token dataset code ${tokenStudyCode} has invalid format`
          );
          return res.status(400).send("Token dataset code format is invalid");
        } else if (await portalAPI.hasDataset(tokenStudyCode)) {
          this.logger.error(
            `Provided token dataset code ${tokenStudyCode} is already used`
          );
          return res.status(400).send("Token dataset code is already used");
        }

        try {
          this.logger.info(`Create dataset ${id}`);
          const vocabSchema = vocabSchemaValue ? vocabSchemaValue : schemaName;

          // Create CDM & Custom schemas with Optional Cleansed Schema
          if (schemaOption != CDMSchemaTypes.NoCDM && schemaName) {
            if (
              schemaOption == CDMSchemaTypes.CreateCDM ||
              schemaOption == CDMSchemaTypes.CustomCDM
            ) {
              try {
                this.logger.info(
                  `Create CDM schema ${schemaName} with ${dataModel} on ${databaseCode} with cleansed schema option set to ${cleansedSchemaOption}`
                );

                const options = {
                  options: {
                    flow_action_type: "create_datamodel",
                    database_code: databaseCode,
                    data_model: dataModel,
                    schema_name: schemaName,
                    cleansed_schema_option: cleansedSchemaOption,
                    vocab_schema: vocabSchema,
                    plugin: plugin,
                  },
                };
                const datamodelFlowRunDto = {
                  flowRunName: `datamodel-create-${schemaName}`,
                  options: options,
                };
                await jobpluginsAPI.createDatamodelFlowRun(datamodelFlowRunDto);
              } catch (error) {
                this.logger.error(
                  `Error while creating new CDM schema! ${error}`
                );
                return res.status(500).send("Error while creating CDM schema");
              }
            }
          }

          this.logger.info("Creating new dataset in Portal");
          const newDatasetInput = {
            id,
            type,
            tokenDatasetCode: tokenStudyCode,
            schemaOption,
            dialect,
            databaseCode: databaseCode,
            schemaName,
            vocabSchemaName: vocabSchema,
            dataModel,
            plugin,
            tenantId,
            paConfigId,
            visibilityStatus,
            detail,
            dashboards,
            attributes,
            tags,
            fhir_project_id: fhirProjectId,
          };
          const newDataset = await portalAPI.createDataset(newDatasetInput);
          if (newDataset.error) {
            return res.status(400).json(newDataset);
          }
          return res.status(200).json(newDataset);
        } catch (error) {
          this.logger.error(
            `Error while creating dataset: ${JSON.stringify(error)}`
          );
          res.status(500).send("Error while creating dataset");
        }
      }
    );

    this.router.post("/snapshot", async (req: Request, res: Response) => {
      const token = req.headers.authorization!;
      const portalAPI = new PortalAPI(token);
      const jobpluginsAPI = new JobPluginsAPI(token);

      const {
        sourceStudyId,
        newStudyName,
        snapshotLocation,
        snapshotCopyConfig,
        dataModel,
      } = req.body;
      const { dialect, databaseCode, schemaName } = await portalAPI.getDataset(
        sourceStudyId
      );

      const sourceHasSchema = schemaName.trim() !== "";
      const id = uuidv4();
      const newSchemaName = sourceHasSchema ? `CDM${id}`.replace(/-/g, "") : "";

      const dataModels = await jobpluginsAPI.getDatamodels();
      const dataModelInfo = dataModels.find(
        (model) => model.datamodel === dataModel
      );

      try {
        const snapshotRequest = {
          id,
          sourceDatasetId: sourceStudyId,
          newDatasetName: newStudyName,
          schemaName: newSchemaName,
          timestamp: new Date(),
        };

        // Copy schema if it exist
        if (sourceHasSchema) {
          this.logger.info(
            `Copy CDM schema from ${schemaName} to ${newSchemaName} with config: (${JSON.stringify(
              snapshotCopyConfig
            )})`
          );

          try {
            const options = {
              options: {
                flow_action_type: this.flowSnapshotType(snapshotLocation),
                database_code: databaseCode,
                schema_name: this.schemaCase(
                  newSchemaName,
                  dialect as DbDialect
                ),
                source_schema: schemaName,
                dialect: dialect,
                snapshot_copy_config: snapshotCopyConfig,
              },
            };

            await jobpluginsAPI.createDatamartFlowRun(
              options,
              dataModelInfo.flowId,
              `datamart-snapshot-${schemaName}`
            );
          } catch (error) {
            this.logger.error(`Error copying CDM schema! ${error}`);
            throw new Error(`Error copying CDM schema! ${error}`);
          }
        }

        this.logger.info("Copying dataset in Portal");
        const newDataset = await portalAPI.copyDataset(snapshotRequest);
        return res.status(200).json(newDataset);
      } catch (error) {
        this.logger.error(
          `Error when copying dataset: ${JSON.stringify(error)}`
        );
        res.status(500).send("Error when copying dataset");
      }
    });

    this.router.get("/dashboard/list", async (req: Request, res: Response) => {
      const { datasetId } = req.query || {};

      if (!datasetId) {
        return res.status(400).send(`datasetId is required`);
      } else if (typeof datasetId !== "string") {
        return res.status(400).send(`datasetId query param is invalid`);
      }

      try {
        const token = req.headers.authorization!;
        const portalAPI = new PortalAPI(token);
        const dataset = await portalAPI.getDataset(datasetId);
        const mapped = dataset.dashboards.map(({ id, name }) => {
          const url = `https://${GATEWAY_WO_PROTOCOL_FQDN}/dashboard-gate/${id}/content?token=${token}`;
          return { name, url };
        });
        return res.status(200).json(mapped);
      } catch (error) {
        this.logger.error(
          `Error when getting dashboards: ${JSON.stringify(error)}`
        );
        res.status(500).send("Error when getting dashboards");
      }
    });
  }
}
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));
app.use("/gateway/api/dataset", new DatasetRouter().router);
app.listen(8000);
