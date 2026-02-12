import pg from "npm:pg";
import { env, services } from "../env.ts";
import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";

export class ShinyLiveService {
  private readonly PUBLIC_BUCKET = "portal-datasets-graphs";
  private readonly baseUrl: string;
  private readonly authToken: string;
  private static pgPool: pg.Pool;

  constructor() {
    this.baseUrl = services.supabaseStorage;
    this.authToken = env.SUPABASE_STORAGE_JWT_TOKEN;

    if (!ShinyLiveService.pgPool) {
      ShinyLiveService.pgPool = new pg.Pool({
        user: env.PG_USER,
        password: env.PG_PASSWORD,
        host: env.PG__HOST,
        port: parseInt(env.PG__PORT),
        database: env.PG__DB_NAME,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: (() => {
          let ssl: boolean | { rejectUnauthorized: boolean; ca: string } =
            false;
          if (env.PG__SSL) {
            ssl = JSON.parse(env.PG__SSL.toLowerCase());
          }
          if (env.PG__CA_ROOT_CERT) {
            ssl = { rejectUnauthorized: true, ca: env.PG__CA_ROOT_CERT };
          }
          return ssl;
        })(),
      });
    }
  }

  getPublicUrl(
    datasetId: string,
    type: string,
    name: string,
    language: string,
    subPath: string,
  ): string {
    const basePath = `${datasetId}/dashboard/${datasetId}_${type}_${name}_${language}`;
    return `${this.baseUrl}/object/public/${this.PUBLIC_BUCKET}/${basePath}/${subPath}`;
  }

  async getStaticFilesDir(
    datasetId: string,
    type: string,
    name: string,
    language: string,
  ): Promise<string | null> {
    const resourcePrefix = `${datasetId}/dashboard/${datasetId}_${type}_${name}_${language}`;
    const tmpDir = path.join(
      "/tmp",
      "shinylive",
      `${datasetId}_${type}_${name}_${language}`,
    );

    try {
      await fs.access(tmpDir);
      return tmpDir;
    } catch {}

    let client: pg.PoolClient;

    try {
      client = await ShinyLiveService.pgPool.connect();
      const query = `
        SELECT name FROM storage.objects
        WHERE bucket_id = $1 AND name LIKE $2
      `;
      const result = await client.query(query, [
        this.PUBLIC_BUCKET,
        `${resourcePrefix}%`,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      await fs.mkdir(tmpDir, { recursive: true });

      for (const row of result.rows) {
        const filePath: string = row.name;
        const relPath = filePath.startsWith(resourcePrefix + "/")
          ? filePath.substring(resourcePrefix.length + 1)
          : filePath;
        const localPath = path.join(tmpDir, relPath);
        await fs.mkdir(path.dirname(localPath), { recursive: true });

        const url = `${this.baseUrl}/object/public/${this.PUBLIC_BUCKET}/${filePath}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          throw new Error(`Failed to download ${url}: ${resp.status}`);
        }
        const data = await resp.arrayBuffer();

        await fs.writeFile(localPath, Buffer.from(data));
      }

      return tmpDir;
    } finally {
      client.release();
    }
  }

  async deleteDatasetShinyLiveResources(
    datasetId: string,
    type: string,
    name: string,
    language: string,
  ): Promise<void> {
    const pattern = `${datasetId}_${type}_${name}_${language}`;
    let client: pg.PoolClient;

    try {
      client = await ShinyLiveService.pgPool.connect();
      const query = `
        SELECT name FROM storage.objects
        WHERE bucket_id = $1 AND name LIKE $2
      `;
      const result = await client.query(query, [
        this.PUBLIC_BUCKET,
        `%${pattern}%`,
      ]);

      if (result.rows.length === 0) {
        return;
      }

      const filePaths = result.rows.map((row: { name: string }) => row.name);

      // Delete all files
      const deleteUrl = `${this.baseUrl}/object/${this.PUBLIC_BUCKET}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ prefixes: filePaths }),
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(
          `Failed to delete files: ${deleteResponse.status} - ${errorText}`,
        );
      }
    } finally {
      client.release();
    }
  }
}
