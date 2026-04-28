import { Inject, Injectable } from '@danet/core'
import { Repository } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { DatasetAttributeConfig } from '../entity/index.ts'

@Injectable()
export class DatasetAttributeConfigRepository extends Repository<DatasetAttributeConfig> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error('DataSource or DataSource.manager is undefined');
    }
    super(DatasetAttributeConfig, dataSource.manager);
  }
  async getAttributeConfigs() {
    return await this.createQueryBuilder('attribute_config').getMany()
  }

  async insertAttributeConfig(attributeConfig: DatasetAttributeConfig) {
    return await this.insert(attributeConfig)
  }

  async updateAttributeConfig(criteria: string, attributeConfig: DatasetAttributeConfig) {
    return await this.update(criteria, attributeConfig)
  }

  async deleteAttributeConfig(attributeConfig: DatasetAttributeConfig) {
    return await this.delete(attributeConfig.id)
  }
}
