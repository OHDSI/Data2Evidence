import express, { Request, Response, Router } from "express";
import { env } from "./env.ts";

const logger = console;

interface SqlQueryTemplate {
  id: string;
  name: string;
  description?: string;
  sqlText: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface DatasetMetadata {
  id: string;
  databaseCode: string;
  schemaName: string;
  vocabSchemaName: string;
  resultSchemaName: string;
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function isValidCohortId(str: string): boolean {
  return /^\d+$/.test(str);
}

function substituteCohortId(sqlTemplate: string, cohortId: string): string {
  return sqlTemplate.replace(/\{\{COHORT_ID\}\}/g, cohortId);
}

async function resolveTemplate(templateId: string, token: string): Promise<SqlQueryTemplate> {
  const envTemplates = env.SQL_QUERY_TEMPLATES;
  if (envTemplates) {
    const sqlText = envTemplates[templateId];
    if (sqlText) {
      return { id: templateId, name: templateId, sqlText, createdAt: "", updatedAt: "" };
    }
    throw new Error(`Template not found: ${templateId}`);
  }

  const serviceRoutes = env.SERVICE_ROUTES || {};
  const baseUrl = serviceRoutes.strategusAnalysis || serviceRoutes["strategus-analysis"] || "";
  if (!baseUrl) {
    throw new Error("Strategus Analysis Service URL not configured and SQL_QUERY_TEMPLATES not set");
  }

  // @ts-ignore Trex global
  const channel = Trex.tokioChannel("d2e-functions/strategus-analysis");
  const url = `${baseUrl}/strategus/analysis/template/${templateId}`;

  try {
    const result = await channel.get(url, { headers: { Authorization: token }, timeout: 20000 });
    return result.data as SqlQueryTemplate;
  } catch (error) {
    if (error?.response?.status === 404) {
      throw new Error(`Template not found: ${templateId}`);
    }
    throw new Error("Template service unavailable");
  }
}

async function resolveDataset(datasetId: string, token: string): Promise<DatasetMetadata> {
  const serviceRoutes = env.SERVICE_ROUTES || {};
  const baseUrl = serviceRoutes.portalServer || serviceRoutes["portal-server"] || "";
  if (!baseUrl) {
    throw new Error("Portal Server URL not configured in SERVICE_ROUTES");
  }

  // @ts-ignore Trex global
  const channel = Trex.tokioChannel("d2e-functions/portal");
  const url = `${baseUrl}/dataset?datasetId=${encodeURIComponent(datasetId)}`;

  try {
    const result = await channel.get(url, { headers: { Authorization: token }, timeout: 20000 });
    return result.data as DatasetMetadata;
  } catch (error) {
    if (error?.response?.status === 404) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }
    throw new Error("Portal service unavailable");
  }
}

const app = express();
app.use(express.json());

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const requestId = crypto.randomUUID();
  let tempFilePath: string | null = null;

  try {
    const token = req.headers.authorization || "";
    const datasetId = req.query.datasetId as string | undefined;
    const cohortId = req.query.cohortId as string | undefined;
    const templateId = req.query.templateId as string | undefined;

    if (!datasetId || !cohortId || !templateId) {
      return res.status(400).json({
        error: "Missing required parameters",
        message: "datasetId, cohortId, and templateId are required",
      });
    }

    if (!isValidUUID(datasetId)) {
      return res.status(400).json({ error: "Invalid parameter", message: "datasetId must be a valid UUID" });
    }
    if (!isValidCohortId(cohortId)) {
      return res.status(400).json({ error: "Invalid parameter", message: "cohortId must be numeric" });
    }

    let template: SqlQueryTemplate;
    try {
      template = await resolveTemplate(templateId, token);
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ error: "Template not found", message: error.message });
      }
      return res.status(503).json({ error: "Template service unavailable", message: "Please try again later" });
    }

    let dataset: DatasetMetadata;
    try {
      dataset = await resolveDataset(datasetId, token);
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ error: "Dataset not found", message: error.message });
      }
      return res.status(503).json({ error: "Portal service unavailable", message: "Please try again later" });
    }

    const substitutedSql = substituteCohortId(template.sqlText, cohortId);

    // @ts-ignore Trex global
    const dbm = Trex.databaseManager();
    const conn = dbm.getConnection(
      dataset.databaseCode,
      dataset.schemaName,
      dataset.vocabSchemaName,
      dataset.resultSchemaName,
      { duckdb: (e: unknown) => e, hana: (e: unknown) => e }
    );

    try {
      const tempDir = Deno.env.get("TMPDIR") || "/tmp";
      tempFilePath = `${tempDir}/export-${requestId}.parquet`;
      const copyQuery = `COPY (${substitutedSql}) TO '${tempFilePath}' (FORMAT PARQUET)`;

      await new Promise((resolve, reject) => {
        conn.execute(copyQuery, [], (err: Error | null, result: unknown) => {
          err ? reject(err) : resolve(result);
        });
      });

      const parquetBuffer = await Deno.readFile(tempFilePath);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename=export-${Date.now()}.parquet`);
      return res.end(Buffer.from(parquetBuffer));
    } catch (error) {
      logger.error(`[${requestId}] Query failed: ${error.message}`);
      return res.status(500).json({ error: "Query execution failed", message: "An error occurred" });
    } finally {
      conn.close();
      if (tempFilePath) {
        try { await Deno.remove(tempFilePath); } catch { /* cleanup */ }
      }
    }
  } catch (error) {
    logger.error(`[${requestId}] Error: ${error.message}`);
    return res.status(500).json({ error: "Internal server error", message: "An unexpected error occurred" });
  }
});

app.use("/parquet-export", router);
app.listen(8000);
