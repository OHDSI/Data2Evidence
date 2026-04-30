import pg from "pg";
import knex, { Knex } from "knex";
import { env } from "./src/env.ts";
import { MigrationSource } from "./src/db/MigrationSource.ts";
import config from "./src/db/knexfile-admin.ts";

const k: Knex = knex(config);
const logger = console;

try {
  logger.info("Initialising datasource for perseus...");
  logger.info(">>> Running Migrations <<<");
  logger.info("PG Schema: ", env.PG_SCHEMA);
  const migrationResult = await k.migrate.latest({
    migrationSource: new MigrationSource(),
  });
  logger.info(`Migrations Done: ${migrationResult}`);
} catch (error) {
  logger.error(`Error while initialising datasource: ${error}`);
} finally {
  await k.destroy();
}
