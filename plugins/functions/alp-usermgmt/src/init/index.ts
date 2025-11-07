import knex from "knex";
import config from "../db/knexfile-admin.ts";
import { MigrationSource } from "../db/MigrationSource.ts";
import { SeedSource } from "../db/SeedSource.ts";
import * as pg from 'pg'

class Init {
  private k = knex(config);

  private async initalizeDataSource() {
    console.log("Initializing DataSource...");
    try {
      console.log(">>> Running Migrations <<<");
      const migrationResult = await this.k.migrate.latest({ migrationSource: new MigrationSource() });
      console.log("Migrations Done:", migrationResult);

      console.log(">>> Running Seeds <<<");
      const seedResult = await this.k.seed.run({ seedSource: new SeedSource() });
      console.log("Seeds Done:", seedResult);

      console.log(">>> Initialization Complete <<<");
    } catch (error) {
      console.error("Error during DataSource initialization:", error);
    } finally {
      await this.k.destroy();
    }
  }

  async start() {
    console.log("Starting Initialization...");
    await this.initalizeDataSource();
  }
}

new Init().start();
