import { runMigrations } from "../db/data-migration.ts";

class Init {
  private readonly logger = console;

  private async initialiseDataSource() {
    this.logger.info("Initialising job-plugins");

    try {
      await runMigrations();
    } catch (error) {
      this.logger.error(`Error while initialising datasource: ${error}`);
      Deno.exit(0);
    }
  }

  async start() {
    await this.initialiseDataSource();
  }
}

new Init().start();
