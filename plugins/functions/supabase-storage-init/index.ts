import knex from "knex";
import config from "./src/db/knexfile-admin.ts";
import { MigrationSource } from "./src/db/MigrationSource.ts";
import * as pg from 'pg'
import { env } from "./src/env.ts";

const k = knex(config);

try {
  console.log("Initializing DataSource...");
  console.log(">>> Running Migrations <<<");
  console.log("directory: ", "supabase");
  console.log("PG Schema: ", env.PG_SCHEMA);
  const migrationResult = await k.migrate.latest({
    migrationSource: new MigrationSource(),
  });
  console.log("Migrations Done:", migrationResult);

  console.log(">>> Initialization Complete <<<");
} catch (error) {
  console.error("Error during DataSource initialization:", error);
} finally {
  await k.destroy();
}
