import { env, envVarUtils } from "./configs";
import {
  DBConnectionUtil as dbConnectionUtil,
  Logger,
  healthCheckMiddleware,
  User,
  Connection,
  getUser,
  utils,
} from "@alp/alp-base-utils";
import * as xsenv from "@sap/xsenv";
import express from "express";
import { MRIConfig } from "./config/config";
import { ConfigFacade as MriConfigFacade } from "./config/ConfigFacade";
import { IDBCredentialsType, IRequest } from "./types";
import { configDefaultValues } from "../cfg/pa/configDefaultValues.ts"
import fs from "node:fs";
declare const Trex: any;
const log = Logger.CreateLogger("mri-config-log");

let credentials;
let isTestEnvironment = false;
const port = env.PORT || 3004;
const app = express();
app.use("/check-liveness", healthCheckMiddleware);

const noCache = (req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
};

const getConnections = async ({
  credentials,
  userObj,
}): Promise<{
  db: Connection.ConnectionInterface;
}> => {
  const db = await dbConnectionUtil.DBConnectionUtil.getDBConnection({
    credentials,
    schemaName: credentials.configSchema || credentials.schema,
    userObj,
  });

  return {
    db,
  };
};

const invokeConfigFacade = async ({
  facade,
  request,
}: {
  facade: MriConfigFacade;
  request: Record<string, unknown>;
}) => {
  return await new Promise<any>((resolve, reject) => {
    facade.invokeService(request, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

function initRoutes() {
  app.use(express.json({ strict: false, limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(noCache);
  app.use((req, res, next) => {
    log.addRequestCorrelationID(req);
    next();
  });
  app.use(async (req: IRequest, res, next) => {
    if (!utils.isHealthProbesReq(req)) {
      let userObj: User;
      try {
        userObj = getUser(req);
      } catch (err) {
        log.debug(`No user found in request:${err.stack}`);
      }

      try {
        req.dbConnections = await getConnections({
          credentials,
          userObj,
        });
      } catch (err) {
        next(err);
      }
    }
    next();
  });

  app.use((req, res, next) => {
    if (!utils.isHealthProbesReq(req)) {
      dbConnectionUtil.DBConnectionUtil.cleanupMiddleware()(
        req as any,
        res,
        next
      );
    } else {
      next();
    }
  });

  app.use("/pa-config-svc/services/config.xsjs", (req: IRequest, res) => {
    // get user from request
    const user = getUser(req);
    const language = user.lang;
    let body: { [key: string]: any } = { language: null, action: null };
    let action;
    if (req.method === "POST") {
      body = req.body;
      body.language = language;
    } else if (req.method === "GET") {
      body = req.query;
      body.language = language;
      action = body.action;
    }
    const mriConfig = new MRIConfig(
      req.dbConnections.db,
      user,
      fs,
      req.headers.authorization
    );
    new MriConfigFacade(
      req.dbConnections.db,
      mriConfig,
      isTestEnvironment,
      fs
    ).invokeService(body, (err, result) => {
      if (err) {
        log.enrichErrorWithRequestCorrelationID(err, req);
        log.error(err);
        return res.status(500).send(err.message);
      }
      if (action === "export") {
        res.set({
          "Content-Type": "application/octet-stream",
          "Content-Disposition": "attachment; filename=" + result.filename,
        });
        res.status(200);
        res.write(result.config);
        res.end();
      } else {
        res.status(200).json(result);
      }
    });
  });

  app.use("/pa-config-svc/enduser", (req: IRequest, res) => {
    // get user from request
    const user = getUser(req);
    const language = user.lang;
    let body: { [key: string]: any } = { language: null, action: null };
    let action;

    if (req.method === "POST") {
      body = req.body;
      body.language = language;
    } else if (req.method === "GET") {
      body = req.query;
      body.language = language;
      action = body.action;
    }

    const mriConfig = new MRIConfig(
      req.dbConnections.db,
      user,
      fs,
      req.headers.authorization
    );

    new MriConfigFacade(
      req.dbConnections.db,
      mriConfig,
      isTestEnvironment,
      fs
    ).invokeService(body, (err, result) => {
      if (err) {
        log.enrichErrorWithRequestCorrelationID(err, req);
        log.error(err);
        return res.status(500).json({ error: err });
      }
      if (action === "export") {
        res.set({
          "Content-Type": "application/octet-stream",
          "Content-Disposition": "attachment; filename=" + result.filename,
        });
        res.status(200);
        res.write(result.config);
        res.end();
      } else {
        res.status(200).json(result);
      }
    });
  });

  app.use("/pa-config-svc/db", (req: IRequest, res) => {
    res.json(configDefaultValues)
  });

  const getDatasetPaConfigId = async ({
    datasetId,
    authToken,
  }: {
    datasetId: string;
    authToken?: string;
  }): Promise<string | null> => {
    const portalBaseUrl = env.SERVICE_ROUTES?.portalServer;
    if (!portalBaseUrl) {
      throw new Error("Portal Server URL is not configured");
    }

    const portalApi = Trex.tokioChannel("d2e-functions/portal");
    const url = `${portalBaseUrl}/dataset?datasetId=${encodeURIComponent(datasetId)}`;
    const options = authToken
      ? {
          headers: {
            Authorization: authToken,
          },
        }
      : undefined;

    const result = await portalApi.get(url, options);
    const dataset = result?.data;
    if (!dataset) {
      return null;
    }

    return dataset.paConfigId || dataset.pa_config_id || null;
  };

  app.get("/pa-config-svc/wizards/config", (req: IRequest, res) => {
    const reqAny = req as any;
    const user = getUser(reqAny);
    const language = user.lang;
    const datasetId = (reqAny.query?.datasetId || "").toString().trim();

    if (!datasetId) {
      return res.status(400).json({ error: "datasetId is required" });
    }

    const mriConfig = new MRIConfig(
      req.dbConnections.db,
      user,
      fs,
      reqAny.headers?.authorization,
    );

    const facade = new MriConfigFacade(
      req.dbConnections.db,
      mriConfig,
      isTestEnvironment,
      fs,
    );

    getDatasetPaConfigId({ datasetId, authToken: reqAny.headers?.authorization })
      .then((paConfigId) => {
        if (!paConfigId) {
          return res.status(200).json({ wizards: [] });
        }

        facade.invokeService(
          {
            action: "getConfig",
            configId: paConfigId,
            configVersion: "A",
            language,
          },
          (getErr, configResult) => {
            if (getErr) {
              log.enrichErrorWithRequestCorrelationID(getErr, reqAny);
              log.error(getErr);
              return res.status(500).json({ error: "Failed to fetch wizards config" });
            }

            const wizards = configResult?.config?.wizardsConfig?.wizards;
            return res.status(200).json({
              wizards: Array.isArray(wizards) ? wizards : [],
            });
          },
        );
      })
      .catch((err) => {
        log.enrichErrorWithRequestCorrelationID(err, reqAny);
        log.error(err);
        return res.status(500).json({ error: "Failed to resolve dataset PA config" });
      });
  });

  app.use((err, req, res, next) => {
    if (err) {
      log.enrichErrorWithRequestCorrelationID(err, req);
      log.error(err);
    }
    next(err);
  });

  app.use("/check-readiness", healthCheckMiddleware);

  app.listen(port);

  log.info(
    `🚀 MRI PA Config started successfully!. Server listening on port ${port}`
  );
}

export function main() {
  try {
    const mountPath =
      env.NODE_ENV === "production" ? env.ENV_MOUNT_PATH : "../../";
    const envFile = `${mountPath}default-env.json`;
    xsenv.loadEnv(envVarUtils.getEnvFile(envFile));

    let ssl = JSON.parse(env.PG__SSL.toLowerCase());
    if (env.PG__CA_ROOT_CERT) {
      ssl = {
        rejectUnauthorized: true,
        ca: env.PG__CA_ROOT_CERT,
      };
    }

  credentials = {
    database: env.PG__DB_NAME,
    schema: env.PG_SCHEMA,
    dialect: env.PG__DIALECT,
    host: env.PG__HOST,
    port: env.PG__PORT,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    ssl,
    max: env.PG__MAX_POOL,
    min: env.PG__MIN_POOL,
    idleTimeoutMillis: env.PG__IDLE_TIMEOUT_IN_MS,
  } as IDBCredentialsType;

  initRoutes();
} catch (err) {
  log.error(err);
  throw new Error(err);
}}
