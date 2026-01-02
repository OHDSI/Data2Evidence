import knex from "knex";
import config from "./src/db/knexfile-admin.ts";
import { MigrationSource } from "./src/db/MigrationSource.ts";
import { SeedSource } from "./src/db/SeedSource.ts";
import * as pg from 'pg'
import "uuid"

const k = knex(config);

try {
  console.log("Initializing DataSource...");
  console.log(">>> Running Migrations <<<");
  const migrationResult = await k.migrate.latest({ migrationSource: new MigrationSource() });
  console.log("Migrations Done:", migrationResult);

  console.log(">>> Running Seeds <<<");
  const seedResult = await k.seed.run({ seedSource: new SeedSource() });
  console.log("Seeds Done:", seedResult);

  console.log(">>> Initialization Complete <<<");
} catch (error) {
  console.error("Error during DataSource initialization:", error);
} finally {
  await k.destroy();
}
