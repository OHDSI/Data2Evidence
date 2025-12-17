import migrationDataSource from "./src/db/migration-data-source.ts";
import { runSeeders } from "./src/db/seeds/seeder.ts";
import * as pg from 'pg';

const logger = console;

try {
  logger.info('Initialising portal');
  await migrationDataSource.initialize();
  logger.info('Datasource is initialised');
  
  logger.info('Running migrations...');
  await migrationDataSource.runMigrations();
  logger.info('~~~ Migrations completed! ~~~');
  
  await runSeeders(migrationDataSource);
  logger.info('~~~ Seeders completed! ~~~');
  await migrationDataSource.destroy();
  logger.info('~~~ Datasource destroyed! ~~~');
} catch (error) {
  logger.error(`Error while initialising datasource: ${error}`);
  console.log(`Error while initialising datasource: ${error}`);
  Deno.exit(1);
}
