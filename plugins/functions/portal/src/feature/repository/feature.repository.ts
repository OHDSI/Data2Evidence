import { Inject, Injectable } from '@danet/core'
import { EntityManager, Repository } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { Feature } from '../entity/feature.entity.ts'

@Injectable()
export class FeatureRepository extends Repository<Feature> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error('DataSource or DataSource.manager is undefined');
    }
    super(Feature, dataSource.manager);
  }

  async getFeatures() {
    return await this.createQueryBuilder('feature').getMany()
  }

  async updateFeature(trxMgr: EntityManager, id: number, entity: Partial<Feature>) {
    await trxMgr.update(Feature, id, entity)
    return {
      id
    }
  }

  async insertFeature(trxMgr: EntityManager, entity: Partial<Feature>) {
    const result = await trxMgr.insert(Feature, entity)
    return {
      id: result.identifiers[0].id
    }
  }

  async getFeature(feature: string) {
    return await this.createQueryBuilder('feature').where('feature.feature = :feature', { feature }).getOne()
  }
}
