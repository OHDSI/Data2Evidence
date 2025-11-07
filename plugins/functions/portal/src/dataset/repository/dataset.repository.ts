import { Injectable, Inject } from '@danet/core'
import { Repository, EntityManager } from 'npm:typeorm'
import { Dataset } from '../entity/index.ts'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'

@Injectable()
export class DatasetRepository extends Repository<Dataset> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error('DataSource or DataSource.manager is undefined');
    }
    super(Dataset, dataSource.manager);
  }

  async getDataset(id: string) {
    return await this.createQueryBuilder('dataset').where('dataset.id = :id', { id }).getOne()
  }

  async updateDataset(trxMgr: EntityManager, id: string, entity: Partial<Dataset>) {
    await trxMgr.update(Dataset, id, entity)
    return {
      id
    }
  }

  async insertDataset(trxMgr: EntityManager, entity: Partial<Dataset>) {
    const result = await trxMgr.insert(Dataset, entity)
    return {
      id: result.identifiers[0].id
    }
  }

  async deleteDataset(trxMgr: EntityManager, id: string) {
    await trxMgr.delete(Dataset, { id })
    return {
      id: id
    }
  }
}
