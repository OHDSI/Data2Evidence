import pg from "pg";
import knex, { Knex } from "knex";
import { env } from "../env.ts";
import { MigrationSource } from "../db/MigrationSource.ts";
import config from "../db/knexfile-admin.ts";

class Init {
  private k: Knex = knex(config);
  private readonly logger = console;

  private async initialiseDataSource() {
    this.logger.info("Initialising datasource for perseus...");
    try {
      this.logger.info(">>> Running Migrations <<<");
      this.logger.info("PG Schema: ", env.PG_SCHEMA);
      const migrationResult = await this.k.migrate.latest({
        migrationSource: new MigrationSource(),
      });
      this.logger.info(`Migrations Done: ${migrationResult}`);
    } catch (error) {
      this.logger.error(`Error while initialising datasource: ${error}`);
    } finally {
      await this.k.destroy();
    }
  }

  async start() {
    await this.initialiseDataSource();
  }
}

new Init().start();
