import { Injectable } from '@danet/core'
import { IDatasetFilterParamsDto } from '../types.d.ts'
import { DatasetRepository } from './repository/index.ts'
import { AnalyticsApi } from '../analytics/analytics.api.ts'

@Injectable()
export class DatasetFilterService {
  constructor(private readonly datasetRepo: DatasetRepository, private readonly analyticsApi: AnalyticsApi) {}

  async getFilterScopes() {
    const datasetsWithSchema = await this.datasetRepo
      .createQueryBuilder('dataset')
      .where('dataset.schemaName is not null')
      .getMany()
    const encodedDatasetsWithSchema = encodeURIComponent(JSON.stringify(datasetsWithSchema))
    return await this.analyticsApi.getFilterScopes(encodedDatasetsWithSchema)
  }

  async getDatabaseSchemaFilterResults(
    filterParams: IDatasetFilterParamsDto,
    datasetsWithSchema: { databaseCode: string; schemaName: string }[]
  ) {
    const encodedDatasetsWithSchema = encodeURIComponent(JSON.stringify(datasetsWithSchema))
    const encodedFilterParams = encodeURIComponent(JSON.stringify(filterParams))

    return await this.analyticsApi.getDatabaseSchemaFilter(encodedDatasetsWithSchema, encodedFilterParams)
  }
}
