import { Router } from "express";
import { runHanaReadWritePipeline } from "../services/runHanaPipeline.js";

const router = Router();

function toBoolean(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  return String(value).toLowerCase() === "true";
}

router.post("/run-all", async (req, res) => {
  let {
    query,
    datasetId,
    cohortDefinitionId,
    sqlQueryParameters,
    resultsSchema,
    dbCredential = {},
  } = req.body || {};

  console.log(`cohortDefinitionId ${cohortDefinitionId}`);
  console.log(`Dataset ID ${datasetId}`);
  // console.log(`Query ${query}`);
  // console.log(`sqlQueryParameters ${JSON.stringify(sqlQueryParameters)}`);
  // console.log(`dbCredential ${JSON.stringify(dbCredential)}`);


  if (!query) {
    return res.status(400).json({
      message: "query is required in request body",
    });
  }

  const sessionVariables = Object
                            .keys(dbCredential)
                            .filter((key) => key.startsWith("SESSIONVARIABLE:"))
                            .reduce((acc, curr, currentIndex) => {
                                console.log(`Processing session variable ${curr} with value ${dbCredential[curr]}`);
                                if (currentIndex > 0) {
                                  acc += ";";
                                }
                                acc += `${curr}=${dbCredential[curr]}`;
                                return acc;
                              }, "")
  
  const config = {
    host: dbCredential.host || process.env.HANA_HOST,
    port: Number(dbCredential.port || process.env.HANA_PORT),
    user: dbCredential.user || process.env.HANA_USER,
    password: dbCredential.password || process.env.HANA_PASSWORD,
    databaseName: dbCredential.databaseName || process.env.HANA_DATABASE,
    useTLS: toBoolean(
      dbCredential.useTLS ?? dbCredential.encrypt ?? process.env.HANA_TLS ?? "true",
      true,
    ),
    sessionVariables,
    query,
    sqlQueryParameters: sqlQueryParameters || [],
    cohortDefinitionId,
    resultsSchema,
  };

  const safeConfig = {
    ...config,
    password: config.password ? "***" : "",
  };
  console.log(
    `Config for HANA connection and query execution: ${JSON.stringify(safeConfig)}`,
  );

  if (
    !config.host ||
    !config.port ||
    !config.user ||
    !config.password ||
    !config.databaseName
  ) {
    return res.status(400).json({
      message:
        "HANA dbCredential details are missing (request body or environment variables)",
    });
  }

  try {
    const result = await runHanaReadWritePipeline(config);
    return res.status(200).json({
      message: "Pipeline completed",
      processedRows: result.processedRows,
    });
  } catch (error) {
    console.error("Pipeline failed", error);
    return res.status(500).json({
      message: "Pipeline failed",
      error: error.message || String(error),
    });
  }
});

export default router;
