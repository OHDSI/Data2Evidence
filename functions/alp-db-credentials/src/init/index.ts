import { env } from '../env'
import { createLogger } from '../logger'
import dataSource from '../common/data-source/data-source'
import { runMigrations } from '../common/data-source/db-migration'
import { loadLocalDatabaseCredentials } from '../local-setup'
// eslint-disable-next-line
import * as pg from 'pg'
import process from 'process'

class Init {
  private readonly logger = createLogger('alp-db-credentials-init')

  private async initialiseDataSource() {
    this.logger.info('Initialising alp db credentials')

    try {
      await dataSource.initialize()
      this.logger.info('Datasource is initialised')
      await runMigrations()
      if (env.NODE_ENV === 'development') {
        loadLocalDatabaseCredentials(this.logger)
      }
    } catch (error) {
      this.logger.error(`Error while initialising datasource: ${error}`)
      process.exit(0)
    }
  }

  async start() {
    await this.initialiseDataSource()
  }
}

new Init().start()
