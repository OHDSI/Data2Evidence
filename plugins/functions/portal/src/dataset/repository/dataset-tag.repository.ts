import { Inject, Injectable } from '@danet/core'
import { EntityManager, Repository } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { DatasetTag } from '../entity/index.ts'
@Injectable()
export class DatasetTagRepository extends Repository<DatasetTag> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error('DataSource or DataSource.manager is undefined');
    }
    super(DatasetTag, dataSource.manager);
  }
  async getTags(datasetId: string) {
    return await this.createQueryBuilder('tag').where('tag.datasetId = :datasetId', { datasetId }).getMany()
  }

  async insertTag(trxMgr: EntityManager, entity: Partial<DatasetTag>) {
    const result = await trxMgr.insert(DatasetTag, entity)
    return {
      id: result.identifiers[0].id
    }
  }

  async deleteTag(trxMgr: EntityManager, criteria: any) {
    return await trxMgr.delete(DatasetTag, criteria)
  }
}
