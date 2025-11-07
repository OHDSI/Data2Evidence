import pg from "pg";
import { env } from "../env";
import { TrexDB } from "./types.ts";

export default class TrexDao {
  private dbConfig;

  constructor() {
    this.dbConfig = {
      user: env["PG_USER"],
      password: env["PG_PASSWORD"],
      host: env["PG_HOST"],
      database: env["PG_DATABASE"],
      port: env["PG_PORT"],
    };
  }

  async getDbs(): Promise<TrexDB[]> {
    const client = new pg.Client(this.dbConfig);
    await client.connect();
    try {
      const result = await client.query(`SELECT * FROM trex.db`);
      return result.rows;
    } catch (error) {
      console.error(`Error getting records from trex.db:`, error);
      throw error;
    } finally {
      client.end();
    }
  }
}
