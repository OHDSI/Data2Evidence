import { Injectable } from '@danet/core'
import { createLogger } from '../logger.ts'
import { Dataset } from '../dataset/entity/index.ts'
import { DatasetDetail } from '../dataset/entity/dataset-detail.entity.ts'
import { WebApiSourceApi } from './webapi-source.api.ts'
import { IDbCredentials, IDaimonRequest, ISourceRequest } from './types.ts'

@Injectable()
export class WebApiSourceService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(private readonly webApiSourceApi: WebApiSourceApi) {}

  async syncSourceForDataset(
    dataset: Dataset,
    datasetDetail: DatasetDetail,
    dbCredentials: IDbCredentials,
    authToken?: string
  ): Promise<void> {
    try {
      const sourceRequest = this.buildSourceRequest(dataset, datasetDetail, dbCredentials)
      const existing = await this.webApiSourceApi.getSourceByKey(dataset.id, authToken)

      if (existing) {
        await this.webApiSourceApi.updateSource(existing.sourceId, sourceRequest, authToken)
      } else {
        await this.webApiSourceApi.createSource(sourceRequest, authToken)
      }

      if (dataset.schemaName) {
        this.triggerCacheCreation(dataset.id, dataset.schemaName, authToken)
      }
    } catch (error) {
      this.logger.error(`Failed to sync WebAPI source for dataset ${dataset.id}: ${error}`)
      throw error
    }
  }

  private async triggerCacheCreation(
    sourceKey: string,
    schemaName: string,
    authToken?: string
  ): Promise<void> {
    try {
      const result = await this.webApiSourceApi.createCache(sourceKey, schemaName, authToken)
      if (!result.success) {
        this.logger.warn(`TrexSQL cache creation failed for ${sourceKey}: ${result.error}`)
      }
    } catch (error) {
      this.logger.error(`Failed to create TrexSQL cache for ${sourceKey}: ${error}`)
    }
  }

  async deleteSourceForDataset(datasetId: string, authToken?: string): Promise<void> {
    try {
      const existing = await this.webApiSourceApi.getSourceByKey(datasetId, authToken)
      if (existing) {
        await this.webApiSourceApi.deleteSource(existing.sourceId, authToken)
      }
    } catch (error) {
      this.logger.error(`Failed to delete WebAPI source for ${datasetId}: ${error}`)
      throw error
    }
  }

  private buildSourceRequest(
    dataset: Dataset,
    detail: DatasetDetail,
    creds: IDbCredentials
  ): ISourceRequest {
    return {
      key: dataset.id,
      name: detail.name,
      dialect: this.mapDialect(dataset.dialect),
      connectionString: this.buildJdbcUrl(creds),
      username: creds.username,
      password: creds.password,
      daimons: this.buildDaimons(dataset),
      krbAuthMethod: 'DEFAULT',
    }
  }

  private mapDialect(dialect: string): string {
    const dialectMap: Record<string, string> = {
      postgres: 'postgresql',
      postgresql: 'postgresql',
      hana: 'hana',
      duckdb: 'duckdb',
    }
    return dialectMap[dialect?.toLowerCase()] || dialect
  }

  private buildJdbcUrl(credentials: IDbCredentials): string {
    const { host, port, database, dialect } = credentials

    switch (dialect?.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        return `jdbc:postgresql://${host}:${port}/${database}`
      case 'hana':
        return `jdbc:sap://${host}:${port}/`
      default:
        this.logger.warn(`Unknown dialect ${dialect}, using generic JDBC URL`)
        return `jdbc:${dialect}://${host}:${port}/${database}`
    }
  }

  private buildDaimons(dataset: Dataset): IDaimonRequest[] {
    const daimons: IDaimonRequest[] = []

    if (dataset.schemaName) {
      daimons.push({
        daimonType: 'CDM',
        tableQualifier: dataset.schemaName,
        priority: 1,
      })
    }

    if (dataset.vocabSchemaName) {
      daimons.push({
        daimonType: 'Vocabulary',
        tableQualifier: dataset.vocabSchemaName,
        priority: 1,
      })
    }

    if (dataset.resultSchemaName) {
      daimons.push({
        daimonType: 'Results',
        tableQualifier: dataset.resultSchemaName,
        priority: 1,
      })
    }

    return daimons
  }
}
