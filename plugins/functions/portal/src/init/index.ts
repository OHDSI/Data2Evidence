import dataSource from "../common/data-source/data-source.ts";
import { runMigrations } from "../common/data-source/db-migration.ts";
import { createLogger } from "../logger.ts";
// import { runSeeders } from "typeorm-extension";
import { runSeeders } from "../common/data-source/seeds/seeder.ts";
// eslint-disable-next-line
import * as pg from 'npm:pg';

class Init {
  private readonly logger = createLogger("portal-init");

  private async initialiseDataSource() {
    this.logger.info("Initialising portal");

    try {
      await dataSource.initialize();
      this.logger.info("Datasource is initialised");
      await runMigrations();
      // Typeorm seeding not compatible with deno
      // Could not find package 'v8' from referrer 'file:///var/tmp/sb-compile-trex/node_modules/localhost/jiti/2.4.2/dist/babel.cjs'
      // Use custom seeder instead
      await runSeeders(dataSource);
    } catch (error) {
      this.logger.error(`Error while initialising datasource: ${error}`);
      console.log(`Error while initialising datasource: ${error}`);
      Deno.exit(1);
    }
  }

  async start() {
    await this.initialiseDataSource();
  }
}

new Init().start();
