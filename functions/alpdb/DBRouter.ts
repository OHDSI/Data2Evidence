import express, { Request, Response } from "express";
import { Buffer } from "node:buffer";
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

    this.router.post("/test", async (req: Request, res: Response) => {
      try {
        const { user, password, host, database, port, extra } = req.body;
        if (!user || !password || !host || !database || !port) {
          return res
            .status(400)
            .send({ error: "Missing required database credentials" });
        }

        // Extract sslmode and ca from extra object
        const extraParams: Record<string, any> = extra || {};
        const { sslmode, ca, ...otherExtra } = extraParams;

        // Build SSL config based on sslmode
        let sslConfig: boolean | object | undefined = undefined;
        if (
          sslmode === "require" ||
          sslmode === "verify-ca" ||
          sslmode === "verify-full"
        ) {
          if (ca) {
            sslConfig = {
              rejectUnauthorized: true,
              ca: Buffer.from(ca as string, "base64").toString("utf-8"),
            };
          } else {
            sslConfig = {
              rejectUnauthorized: false,
              checkServerIdentity: () => undefined,
            };
          }
        }
        const client = new pg.Client({
          user,
          password,
          host,
          database,
          port,
          connectionTimeoutMillis: 30000,
          ssl: sslConfig,
          ...otherExtra,
        });

        await client.connect();
        client.end().catch(() => {});

        return res
          .status(200)
          .send({ success: true, message: "Connection successful" });
      } catch (error: any) {
        this.logger.error("Error when testing connection:", {
          message: error.message,
          code: error.code,
          detail: error.detail,
        });
        return res.status(500).send({
          success: false,
          error: error.message,
          code: error.code,
          detail: error.detail,
          hint: error.hint,
        });
      }
    });
  }
}
