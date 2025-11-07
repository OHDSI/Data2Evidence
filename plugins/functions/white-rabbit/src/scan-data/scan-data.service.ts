import pg from "pg";
import { Service } from "typedi";
import { FilesManagerAPI } from "../api/filesManagerAPI.ts";
import { env } from "../env.ts";
import { ConversionWithLogsResponse } from "./models/conversionWithLogsResponse.ts";

interface ScanDataResult {
  fileId: number;
  fileName: string;
}

@Service()
export class ScanDataService {
  private readonly logger = console;

  constructor() {}

  private getClient(): pg.Client {
    return new pg.Client({
      host: env.PG__HOST,
      port: env.PG__PORT,
      database: env.PG__DB_NAME,
      user: env.PG_ADMIN_USER!,
      password: env.PG_ADMIN_PASSWORD!,
    });
  }

  async scanResult(
    conversionId: number,
    username: string
  ): Promise<ScanDataResult> {
    this.logger.info("Getting scan result", { conversionId, username });

    const client = this.getClient();

    try {
      await client.connect();

      const resultQuery = `
        SELECT username, file_name, file_id
        FROM white_rabbit.scan_conversion
        WHERE id = $1
      `;

      const resultResponse = await client.query(resultQuery, [conversionId]);

      if (resultResponse.rows.length === 0) {
        throw new Error(`Scan Data Conversion not found by id ${conversionId}`);
      }

      if (resultResponse.rows[0].username !== username) {
        throw new Error("Forbidden to get Scan Data Conversion for other user");
      }

      return {
        fileId: resultResponse.rows[0].file_id,
        fileName: resultResponse.rows[0].file_name,
      };
    } finally {
      await client.end();
    }
  }

  async scanReport(conversionId: number, token: string) {
    const client = this.getClient();
    try {
      await client.connect();
      const resultQuery = `
        SELECT file_id
        FROM white_rabbit.scan_conversion
        WHERE id = $1
      `;

      const resultResponse = await client.query(resultQuery, [conversionId]);

      if (resultResponse.rows.length === 0) {
        throw new Error(
          `Scan Data Conversion Result not found by conversion id ${conversionId}`
        );
      }
      const fileId = resultResponse.rows[0].file_id;

      const filesManagerAPI = new FilesManagerAPI(token);
      const result = await filesManagerAPI.getFile(fileId); // this is actually the user data id
      return result;
    } catch (error) {
      this.logger.error(`Error getting scan report: ${error}`);
    } finally {
      await client.end();
    }
  }

  async saveConversion(
    flow_run_id: string,
    username: string,
    file_name: string,
    file_id: number
  ) {
    this.logger.info("Starting saveConversion...", {
      flow_run_id,
      username,
      file_name,
      file_id,
    });

    const client = this.getClient();

    try {
      await client.connect();

      const query = `
        INSERT INTO white_rabbit.scan_conversion
        (id, username, file_name, file_id)
        VALUES($1, $2, $3, $4)
        RETURNING id; 
      `;

      const resultResponse = await client.query(query, [
        flow_run_id,
        username,
        file_name,
        file_id,
      ]);

      return resultResponse;
    } catch (error) {
      this.logger.error(flow_run_id, username, file_id, file_name);
      this.logger.error(`Error saving conversion:`, error);
      throw error;
    } finally {
      this.logger.info("Closing database connection");
      await client.end();
    }
  }
}
