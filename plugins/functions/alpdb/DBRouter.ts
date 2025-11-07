import express, { Request } from "express";
import { JobpluginsAPI } from "./api/JobpluginsAPI.ts";
import TrexDao from "./dao/trex.ts";
import pg from "pg";

export class DBRouter {
  public router = express.Router();
  private readonly logger = console; //createLogger(this.constructor.name)

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.get("/dataset/version-info", async (req, res) => {
      try {
        const token = req.headers.authorization!;
        const jobpluginsAPI = new JobpluginsAPI(token);
        const result = await jobpluginsAPI.getSchemasVersionInformation();
        return res.status(200).json(result);
      } catch (error) {
        this.logger.error(
          `Error when getting schemas version information: ${JSON.stringify(
            error
          )}`
        );
        res.status(500).send("Error when getting schemas version information");
      }
    });

    this.router.put("/schema", async (req, res) => {
      const { schemaName, dataModel, databaseCode, vocabSchemaValue, plugin } =
        req.body;
      try {
        const token = req.headers.authorization!;
        const jobpluginsAPI = new JobpluginsAPI(token);

        const datamodels = await jobpluginsAPI.getDatamodels();
        const dmInfo = datamodels.find(
          (model) => model.datamodel === dataModel
        );

        const options = {
          options: {
            flow_action_type: "update_datamodel",
            database_code: databaseCode,
            data_model: dataModel,
            schema_name: schemaName,
            vocab_schema: vocabSchemaValue,
            plugin: plugin,
          },
        };

        const result = await jobpluginsAPI.createDataModelFlowRun(
          options,
          dmInfo.flowId,
          `datamodel-update-${schemaName}`
        );
        return res.status(200).json(result);
      } catch (error) {
        this.logger.error(
          `Error when updating schema ${schemaName}: ${JSON.stringify(error)}`
        );
        res.status(500).send(`Error when updating schema ${schemaName}`);
      }
    });

    this.router.get(
      "/database-creds/list",
      async (req: Request, res: Response) => {
        try {
          const dbDao = new TrexDao();
          const dbs = await dbDao.getDbs();
          return res.status(200).json(dbs);
        } catch (error) {
          this.logger.error(`Error fetching database credentials: ${error}`);
          const httpResponse = {
            status: 500,
            message: "Something went wrong when fetching database credentials",
            data: [],
          };
          res.status(500).json(httpResponse);
        }
      }
    );

    this.router.get("/test", async (req: Request, res: Response) => {
      try {
        const { user, password, host, database, port } = req.query;
        if (!user || !password || !host || !database || !port) {
          return res
            .status(400)
            .send({ error: "Missing required database credentials" });
        }

        const client = new pg.Client({
          user,
          password,
          host,
          database,
          port,
          connectionTimeoutMillis: 5000,
        });

        await client.connect();
        await client.end();

        return res
          .status(200)
          .send({ success: true, message: "Connection successful" });
      } catch (error) {
        this.logger.error(
          `Error when testing connection: ${JSON.stringify(error)}`
        );
        return res.status(500).send({ success: false, error: error.message });
      }
    });
  }
}
