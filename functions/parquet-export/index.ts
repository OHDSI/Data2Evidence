import express, { Request, Response, Router } from "express";
import * as parquet from "parquetjs";
import { PassThrough } from "stream";
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

function inferParquetType(value: unknown): string {
  if (value === null || value === undefined) return "UTF8";
  if (typeof value === "number") return Number.isInteger(value) ? "INT64" : "DOUBLE";
  if (typeof value === "boolean") return "BOOLEAN";
  if (value instanceof Date) return "TIMESTAMP_MILLIS";
  return "UTF8";
}

function buildParquetSchema(rows: Record<string, unknown>[]): parquet.ParquetSchema {
  if (!rows || rows.length === 0) {
    return new parquet.ParquetSchema({});
  }

  const fields: Record<string, { type: string; optional: boolean }> = {};
  for (const [columnName, value] of Object.entries(rows[0])) {
    fields[columnName] = { type: inferParquetType(value), optional: true };
  }
  return new parquet.ParquetSchema(fields);
}

async function writeParquetBuffer(
  rows: Record<string, unknown>[],
  schema: parquet.ParquetSchema
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const outputStream = new PassThrough();
  outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));

  const writer = await parquet.ParquetWriter.openStream(schema, outputStream);
  for (const row of rows) {
    await writer.appendRow(row);
  }
  await writer.close();

  return Buffer.concat(chunks);
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
  logger.info(`[${requestId}] Parquet export request`);

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
    if (!isValidUUID(templateId)) {
      return res.status(400).json({ error: "Invalid parameter", message: "templateId must be a valid UUID" });
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
      const results = await new Promise((resolve, reject) => {
        conn.execute(substitutedSql, [], (err: Error | null, result: unknown) => {
          err ? reject(err) : resolve(result);
        });
      });

      const resultArray = results as Record<string, unknown>[];
      if (!resultArray || resultArray.length === 0) {
        const emptySchema = new parquet.ParquetSchema({ _empty: { type: "BOOLEAN", optional: true } });
        const emptyBuffer = await writeParquetBuffer([], emptySchema);
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename=export-${Date.now()}.parquet`);
        return res.end(emptyBuffer);
      }

      const schema = buildParquetSchema(resultArray);
      const parquetBuffer = await writeParquetBuffer(resultArray, schema);

      logger.info(`[${requestId}] Export complete: ${resultArray.length} rows, ${parquetBuffer.length} bytes`);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename=export-${Date.now()}.parquet`);
      return res.end(parquetBuffer);
    } catch (error) {
      logger.error(`[${requestId}] Query failed: ${error.message}`);
      return res.status(500).json({ error: "Query execution failed", message: "An error occurred" });
    } finally {
      conn.close();
    }
  } catch (error) {
    logger.error(`[${requestId}] Error: ${error.message}`);
    return res.status(500).json({ error: "Internal server error", message: "An unexpected error occurred" });
  }
});

app.use("/parquet-export", router);
app.listen(8000);
