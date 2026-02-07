/**
 * PostgreSQL schema creation and teardown for DB-dependent integration tests.
 *
 * Creates the `trex` schema and `trex.db` table directly (avoiding full
 * KnexMigration which requires migration files at a specific path).
 */

import pg from "npm:pg";
import { env } from "../../env.ts";

let client: any;

export async function setupDatabase() {
  client = new pg.Client({
    user: env.PG__USER,
    password: env.PG__PASSWORD,
    host: env.PG__HOST,
    port: parseInt(env.PG__PORT!),
    database: env.PG__DB_NAME,
    ssl: false,
  });

  await client.connect();

  // Create schema and table
  await client.query(`CREATE SCHEMA IF NOT EXISTS trex`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS trex.db (
      id TEXT PRIMARY KEY,
      host TEXT,
      port INTEGER,
      name TEXT,
      dialect TEXT,
      credentials JSONB,
      vocab_schemas JSONB,
      publications JSONB,
      db_extra JSONB,
      authentication_mode TEXT
    )
  `);

  return client;
}

export async function teardownDatabase() {
  if (client) {
    await client.query(`DROP TABLE IF EXISTS trex.db CASCADE`);
    await client.query(`DROP SCHEMA IF EXISTS trex CASCADE`);
    await client.end();
  }
}

export function getClient() {
  return client;
}
