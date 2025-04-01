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

  async conversionInfoWithLogs(
    conversionId: number,
    username: string
  ): Promise<ConversionWithLogsResponse> {
    this.logger.info("Getting conversion info with logs", {
      conversionId,
      username,
    });

    const client = this.getClient();

    try {
      await client.connect();

      const conversionQuery = `
        SELECT id, username, status_code, status_name
        FROM white_rabbit.scan_data_conversions
        WHERE id = $1
      `;

      const conversionResult = await client.query(conversionQuery, [
        conversionId,
      ]);

      if (conversionResult.rows.length === 0) {
        throw new Error(`Scan Data Conversion not found by id ${conversionId}`);
      }

      const conversion = conversionResult.rows[0];

      if (conversion.username !== username) {
        throw new Error("Forbidden to get Scan Data Conversion for other user");
      }

      const logsQuery = `
        SELECT id, message, time, status_code, status_name, percent
        FROM white_rabbit.scan_data_logs
        WHERE conversion_id = $1
        ORDER BY id ASC
      `;

      const logsResult = await client.query(logsQuery, [conversionId]);

      return {
        id: conversion.id,
        statusCode: conversion.status_code,
        statusName: conversion.status_name,
        logs: logsResult.rows.map((log) => ({
          message: log.message,
          statusCode: log.status_code,
          statusName: log.status_name,
          percent: log.percent,
          time: log.time,
        })),
      };
    } finally {
      await client.end();
    }
  }

  async scanResult(
    conversionId: number,
    username: string
  ): Promise<ScanDataResult> {
    this.logger.info("Getting scan result", { conversionId, username });

    const client = this.getClient();

    try {
      await client.connect();

      const conversionQuery = `
        SELECT id, username
        FROM white_rabbit.scan_data_conversions
        WHERE id = $1
      `;

      const conversionResult = await client.query(conversionQuery, [
        conversionId,
      ]);

      if (conversionResult.rows.length === 0) {
        throw new Error(`Scan Data Conversion not found by id ${conversionId}`);
      }

      if (conversionResult.rows[0].username !== username) {
        throw new Error("Forbidden to get Scan Data Conversion for other user");
      }

      const resultQuery = `
        SELECT file_name, file_id
        FROM white_rabbit.scan_data_results
        WHERE scan_data_conversion_id = $1
      `;

      const resultResponse = await client.query(resultQuery, [conversionId]);

      if (resultResponse.rows.length === 0) {
        throw new Error(
          `Scan Data Conversion Result not found by conversion id ${conversionId}`
        );
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
        FROM white_rabbit.scan_data_results
        WHERE scan_data_conversion_id = $1
      `;

      const resultResponse = await client.query(resultQuery, [conversionId]);

      if (resultResponse.rows.length === 0) {
        throw new Error(
          `Scan Data Conversion Result not found by conversion id ${conversionId}`
        );
      }
      const fileId = resultResponse.rows[0].file_id;

      const filesManagerAPI = new FilesManagerAPI(token);
      const result = await filesManagerAPI.getFile(fileId);
      return result;
    } catch (error) {
      this.logger.error(`Error getting scan report: ${error}`);
    } finally {
      await client.end();
    }
  }
}
