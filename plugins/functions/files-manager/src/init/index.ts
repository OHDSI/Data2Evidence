import { runMigrations } from "../common/data-source/db-migration";
import * as pg from "pg";

class Init {
  private readonly logger = console;

  private async initialiseDataSource() {
    this.logger.info("Initialising files-manager");

    try {
      await runMigrations();
    } catch (error) {
      this.logger.error(`Error while initialising datasource: ${error}`);
      process.exit(0);
    }
  }

  async start() {
    await this.initialiseDataSource();
  }
}

new Init().start();
