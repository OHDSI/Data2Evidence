import { createLogger } from '../../logger.ts';
import migrationDataSource from './migration-data-source.ts';

export const runMigrations = async () => {
  const logger = createLogger('db-migration')

  try {
    logger.info('Running migrations...')
    await migrationDataSource.initialize().then(()=> {console.log(
      "datasoure initialized"
    )} ).catch((err) => {
      console.log("error in datasource", err)
    })
    await migrationDataSource.runMigrations().then(() => {console.log("migration started")}
    ).catch((err) => {
      console.log("error in migration", err)
    })
    logger.info('~~~ Migrations completed! ~~~')
  } catch (err) {
    logger.error('Cannot start the app. Migrations has failed!', err)
    Deno.exit(0)
  }
}
