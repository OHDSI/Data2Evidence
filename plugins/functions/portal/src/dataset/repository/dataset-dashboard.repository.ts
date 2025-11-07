import { Inject, Injectable } from '@danet/core'
import { EntityManager, Repository } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { DatasetDashboard } from '../entity/index.ts'

@Injectable()
export class DatasetDashboardRepository extends Repository<DatasetDashboard> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error('DataSource or DataSource.manager is undefined');
    }
    super(DatasetDashboard, dataSource.manager);
  }

  async insertDashboard(trxMgr: EntityManager, entity: Partial<DatasetDashboard>) {
    const result = await trxMgr.insert(DatasetDashboard, entity)
    return {
      id: result.identifiers[0].id
    }
  }

  async deleteDashboard(trxMgr: EntityManager, criteria: { name: string; url: string; basePath: string }) {
    return await trxMgr.delete(DatasetDashboard, criteria)
  }
}
