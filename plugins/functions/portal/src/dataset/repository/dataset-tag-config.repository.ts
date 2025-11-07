import { Inject, Injectable } from '@danet/core'
import { Repository } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { DatasetTagConfig } from '../entity/index.ts'

@Injectable()
export class DatasetTagConfigRepository extends Repository<DatasetTagConfig> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error('DataSource or DataSource.manager is undefined');
    }
    super(DatasetTagConfig, dataSource.manager);
  }
  async getTagConfigs() {
    return await this.createQueryBuilder('tag_config').getMany()
  }

  async insertTagConfig(tagConfig: DatasetTagConfig) {
    return await this.insert(tagConfig)
  }

  async deleteTagConfig(tagConfig: DatasetTagConfig) {
    return await this.delete(tagConfig.name)
  }
}
