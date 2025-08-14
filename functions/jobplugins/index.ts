import express from "npm:express";
import pg from "npm:pg";
import { AnalysisController } from "./src/controllers/AnalysisController.ts";
import { CachedbController } from "./src/controllers/CachedbController.ts";
import { CohortController } from "./src/controllers/CohortController.ts";
import { CohortSurvivalController } from "./src/controllers/CohortSurvivalController.ts";
import { DataCharacterizationController } from "./src/controllers/DataCharacterizationController.ts";
import { DataModelFlowController } from "./src/controllers/DataModelFlowController.ts";
import { DataTransformationController } from "./src/controllers/DataTransformationController.ts";
import { DbSvcController } from "./src/controllers/DbSvcController.ts";
import { DqdController } from "./src/controllers/DqdController.ts";
import { PerseusController } from "./src/controllers/PerseusController.ts";
import { PrefectController } from "./src/controllers/PrefectController.ts";
import { ResearcherController } from "./src/controllers/ResearcherController.ts";
import { SearchEmbeddingController } from "./src/controllers/SearchEmbeddingController.ts";
import { WhiteRabbitController } from "./src/controllers/WhiteRabbitController.ts";
import { initialiseDataSource } from "./src/db/data-migration.ts";
import extractUsernameFromJwt from "./src/middlewares/extractUsernameFromJwt.ts";

const app = express();
const env = Deno.env.toObject();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(extractUsernameFromJwt);
app.use("/jobplugins/dqd/data-quality", new DqdController().router);
app.use("/jobplugins/cohort", new CohortController().router);
app.use("/jobplugins/cohort-survival", new CohortSurvivalController().router);
app.use("/jobplugins/db-svc", new DbSvcController().router);
app.use(
  "/jobplugins/dqd/data-characterization",
  new DataCharacterizationController().router
);
app.use("/jobplugins/search-embedding", new SearchEmbeddingController().router);
app.use("/jobplugins/datamodel", new DataModelFlowController().router);
app.use("/jobplugins/dataflow", new DataTransformationController().router);
app.use("/jobplugins/prefect", new PrefectController().router);
app.use("/jobplugins/analysisflow", new AnalysisController().router);
app.use("/jobplugins/cachedb", new CachedbController().router);
app.use("/jobplugins/white-rabbit", new WhiteRabbitController().router);
app.use("/jobplugins/perseus", new PerseusController().router);
app.use("/jobplugins/researcher", new ResearcherController().router);

let ssl = JSON.parse(env.PG__SSL.toLowerCase());
if (env.PG__CA_ROOT_CERT) {
  ssl = {
    rejectUnauthorized: true,
    ca: env.PG__CA_ROOT_CERT,
  };
}

const opt = {
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  host: env.PG__HOST,
  port: parseInt(env.PG__PORT),
  database: env.PG__DB_NAME,
  ssl,
};
const pgclient = new pg.Client(opt);
await pgclient.connect();
const r = await pgclient.query(
  `SELECT name,url,payload::JSON FROM trex.plugins where payload->'flow' is not null`
);
let flows = [];
for (const row of r.rows) {
  if (row.payload.flow.flows) flows = flows.concat(row.payload.flow.flows);
}

if (!env.PREFECT_API_URL) {
  console.error("Prefect URL not defined: skipping flow plugins");
  throw new Error("No baseUrl is set for Prefect API");
}

async function callPrefect(name: string) {
  const res = await fetch(
    `${env.PREFECT_API_URL}/deployments/name/${name}/${name}`,
    {
      method: "GET",
    }
  );
  if (res.status != 200) {
    console.error(`Error getting flow`);
    console.log(res);
  }
  const flow = await res.json();
  const createFlowRes = await fetch(
    `${env.PREFECT_API_URL}/deployments/${flow["id"]}/create_flow_run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );
  if (createFlowRes.status != 200) {
    console.log(`Error creating flow run`);
    console.log(createFlowRes);
  }
  return await createFlowRes.json();
}

// TODO: Migrate to controller
// Get list of job plugins
app.get("/jobplugins", (req, res) => {
  try {
    const plugins = flows.map((f) => ({ name: f["name"], type: f["type"] }));
    res.send(JSON.stringify(plugins));
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Test endpoint
app.get("/jobplugins/test", (req, res) => {
  try {
    res.send(req.query.dsid);
    console.log("test avoid callback, to use async");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Execute job plugin by name
app.get("/jobplugins/exec/:name", async (req, res) => {
  try {
    const _flows = flows.filter((flow) => flow["name"] === req.params.name);
    console.log("test avoid callback, to use async");

    if (_flows.length === 0) {
      return res.status(404).send({ message: "Flow not found" });
    }

    const result = await callPrefect(_flows[0]["name"]);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Execute job plugin by type
app.get("/jobplugins/exec_type/:type", async (req, res) => {
  try {
    const _flows = flows.filter((flow) => flow["type"] === req.params.type);

    if (_flows.length === 0) {
      return res.status(404).send({ message: "Flow not found" });
    }

    const result = await callPrefect(_flows[0]["name"]);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.get("/jobplugins/exec_datamodel/:datamodel", async (req, res) => {
  try {
    const _flows = flows.filter((flow) => {
      return (
        flow["type"] === "datamodel" &&
        flow["datamodels"]?.indexOf(req.params.datamodel) > -1
      );
    });

    if (_flows.length === 0) {
      return res
        .status(404)
        .send({ message: "No flows found for the datamodel" });
    }

    const flowName = _flows[0]["name"];
    const result = await callPrefect(flowName);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

await initialiseDataSource();
app.listen(8000);
