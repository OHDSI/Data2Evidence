import migrationDataSource from "./src/db/migration-data-source.ts";
import * as pg from "pg";

const logger = console;

try {
  logger.info("Running files-manager migrations...");
  await migrationDataSource.initialize();
  await migrationDataSource.runMigrations();
  logger.info("~~~ Migrations files-manager completed! ~~~");
} catch (err) {
  logger.error("files-manager migrations has failed!", err);
  Deno.exit(0);
}
