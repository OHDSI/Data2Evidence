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
        await this.triggerCacheCreation(dataset.id, dataset.schemaName, authToken)
      }
    } catch (error) {
      this.logger.error(`Failed to sync WebAPI source for dataset ${dataset.id}: ${error}`)
      throw error
    }
  }

  // Kick off the TrexSQL cache build. We deliberately do NOT await
  // `waitForCacheReady` here: bao's COMPLETED transition can take minutes, and
  // edge-function HTTP callers (e.g. the dataset gateway) time out well before
  // that. Consumers that depend on a hot cache (DQD, DC, analytics-svc
  // cdmversion) must wait for readiness explicitly via `waitForCacheReady`.
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

  // Block until the TrexSQL cache for the given dataset is COMPLETED.
  // Call this from consumers that explicitly need a hot cache (DQD/DC kickoff).
  async waitForCacheReady(sourceKey: string, authToken?: string): Promise<void> {
    try {
      await this.webApiSourceApi.waitForCacheReady(sourceKey, authToken)
    } catch (error) {
      this.logger.error(`Cache wait failed for ${sourceKey}: ${error}`)
      throw error
    }
  }

  // Snapshot the TrexSQL cache state for a dataset. Callers poll this and decide
  // when it's safe to issue queries that read from the cache catalog.
  //
  // bao returns a single :activeJob field (no separate :lastJob). For postgres/
  // bigquery dialects the cache POST builds synchronously and never inserts a
  // job row, so activeJob is null and the cache is ready as soon as the file
  // exists + is attached. For JDBC dialects, the job row persists after the
  // batch finishes with status=COMPLETED — treat that as ready too.
  async getCacheStatus(sourceKey: string, authToken?: string): Promise<{
    ready: boolean
    cacheExists: boolean
    cacheAttached: boolean
    activeJobStatus?: string | null
    lastJobError?: string | null
  }> {
    const status = await this.webApiSourceApi.getCacheStatus(sourceKey, authToken)
    const jobStatus = status.activeJob?.status ?? null
    const jobDone = jobStatus === null || jobStatus === 'COMPLETED'
    const ready = !!status.cacheExists && !!status.cacheAttached && jobDone
    return {
      ready,
      cacheExists: !!status.cacheExists,
      cacheAttached: !!status.cacheAttached,
      activeJobStatus: jobStatus,
      lastJobError: status.activeJob?.error ?? null,
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
