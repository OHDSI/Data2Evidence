import { Inject, Injectable } from '@danet/core'
import { EntityManager, Repository } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { DatasetDetail } from '../entity/index.ts'

@Injectable()
export class DatasetDetailRepository extends Repository<DatasetDetail> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error('DataSource or DataSource.manager is undefined');
    }
    super(DatasetDetail, dataSource.manager);
  }
  async getDetail(datasetId: string) {
    return await this.createQueryBuilder('detail').where('detail.datasetId = :datasetId', { datasetId }).getOne()
  }

  async insertDetail(trxMgr: EntityManager, entity: Partial<DatasetDetail>) {
    const result = await trxMgr.insert(DatasetDetail, entity)
    return {
      id: result.identifiers[0].id
    }
  }
}
