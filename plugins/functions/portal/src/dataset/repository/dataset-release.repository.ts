import { Inject, Injectable } from '@danet/core'
import { EntityManager, Repository } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { DatasetRelease } from '../entity/index.ts'

@Injectable()
export class DatasetReleaseRepository extends Repository<DatasetRelease> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error('DataSource or DataSource.manager is undefined');
    }
    super(DatasetRelease, dataSource.manager);
  }

  async insertRelease(trxMgr: EntityManager, entity: Partial<DatasetRelease>) {
    const result = await trxMgr.insert(DatasetRelease, entity)
    return {
      id: result.identifiers[0].id
    }
  }

  async getReleaseByDatasetIdAndName(datasetId: string, releaseName: string) {
    return await this.createQueryBuilder('release')
      .where('release.dataset_id = :datasetId and release.name = :name', { datasetId: datasetId, name: releaseName })
      .getMany()
  }
}
