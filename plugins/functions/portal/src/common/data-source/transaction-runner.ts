import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@danet/core'
// import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, EntityManager } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { DEFAULT_ERROR_MESSAGE } from '../const.ts'
@Injectable()
export class TransactionRunner {
  private dataSource: DataSource
  constructor(
    @Inject(DATABASE) postgresService: PostgresService
  ) {
    this.dataSource = postgresService.getDataSource()
  }

  private async initDataSource() {
    if (!this.dataSource.isInitialized) {
      try {
        await this.dataSource.initialize()
      } catch (e) {
        console.error(`Datasource initialisation has failed: ${e}`)
        throw new InternalServerErrorException('Datasource initialisation has failed')
      }
    }
  }

  async run<T>(fn: (entityMgr: EntityManager, arg: T) => any, arg: T) {
    await this.initDataSource()
    const queryRunner = this.dataSource.createQueryRunner()
    const entityMgr = queryRunner.manager
    await queryRunner.startTransaction()
    try {
      const result = await fn(entityMgr, arg)
      await queryRunner.commitTransaction()
      return result
    } catch (e) {
      console.error(`Error occurred while executing ${fn.name}: ${e}`)
      await queryRunner.rollbackTransaction()
      if (e instanceof BadRequestException || e instanceof InternalServerErrorException) {
        throw e
      }
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE)
    } finally {
      await queryRunner.release()
    }
  }
}
