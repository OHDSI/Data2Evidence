import { Injectable } from '@danet/core'
import { createLogger } from '../logger.ts'
import { Dataset } from '../dataset/entity/index.ts'
import { DatasetDetail } from '../dataset/entity/dataset-detail.entity.ts'
import { WebApiSourceApi } from './webapi-source.api.ts'
import { IDbCredentials, IDaimonRequest, ISourceRequest } from './types.ts'
import { findRoleByName, sourceUserRoleName } from './webapi-role.util.ts'
import { JobPluginsApi } from './jobplugins.api.ts'
import { sanitizeIdForCacheId } from '../dataset/entity/dataset.entity.ts'

// Mirrors org.ohdsi.webapi.common.DBMSType. A source whose dialect is absent there throws from
// DataSourceDTOParser during WebAPI's connection check, and that exception escapes
// SourceService.checkConnectionSafe — aborting priority daimon resolution for every source, not
// just this one.
const WEBAPI_SUPPORTED_DIALECTS = new Set([
  'postgresql',
  'sql server',
  'pdw',
  'redshift',
  'oracle',
  'impala',
  'bigquery',
  'netezza',
  'hive',
  'spark',
  'snowflake',
  'synapse',
])

@Injectable()
export class WebApiSourceService {
  private readonly logger = createLogger(this.constructor.name)

  // dataset id -> most recent cache flow run. In-memory only: a portal restart
  // loses it, and getCacheStatus then reports "no active job" rather than lying
  // about a build it cannot see. Callers re-trigger, which is idempotent.
  private readonly cacheFlowRuns = new Map<string, string>()

  constructor(
    private readonly webApiSourceApi: WebApiSourceApi,
    private readonly jobPluginsApi: JobPluginsApi,
  ) {}

  async syncSourceForDataset(
    dataset: Dataset,
    datasetDetail: DatasetDetail,
    dbCredentials: IDbCredentials,
    authToken?: string
  ): Promise<void> {
    const dialect = this.mapDialect(dataset.dialect)
    const isHana = dialect === 'hana'
    if (!WEBAPI_SUPPORTED_DIALECTS.has(dialect)) {
      await this.warnUnsupportedDialect(dataset.id, dialect, authToken)
      if (dataset.schemaName && !isHana) {
        await this.triggerCacheCreation(dataset.id, dataset.schemaName, authToken)
      } else if (isHana) {
        this.logger.debug(
          `Skipping cache build for dataset ${dataset.id}: HANA has no DuckDB cache on any dataset type`
        )
      }
      return
    }

    try {
      const sourceRequest = this.buildSourceRequest(dataset, datasetDetail, dbCredentials)
      const existing = await this.webApiSourceApi.getSourceByKey(dataset.id, authToken)

      if (existing) {
        await this.webApiSourceApi.updateSource(existing.sourceId, sourceRequest, authToken)
      } else {
        await this.webApiSourceApi.createSource(sourceRequest, authToken)
      }

      if (dataset.schemaName && !isHana) {
        await this.triggerCacheCreation(dataset.id, dataset.schemaName, authToken)
      } else if (isHana) {
        this.logger.debug(
          `Skipping cache build for dataset ${dataset.id}: HANA has no DuckDB cache on any dataset type`
        )
      }
    } catch (error) {
      this.logger.error(`Failed to sync WebAPI source for dataset ${dataset.id}: ${error}`)
      throw error
    }
  }

  private async warnUnsupportedDialect(
    datasetId: string,
    dialect: string,
    authToken?: string
  ): Promise<void> {
    const existing = await this.webApiSourceApi.getSourceByKey(datasetId, authToken).catch(() => null)
    const suffix = existing
      ? `; existing source ${existing.sourceId} left in place and must be removed manually`
      : ''
    this.logger.warn(
      `Skipping WebAPI sync for dataset ${datasetId}: WebAPI does not support dialect '${dialect}'${suffix}`
    )
  }

  // Build the cache with the same Prefect flow every other dataset type uses.
  // jobplugins resolves the dataset and derives the cache catalog itself, so the
  // dataset id is all we send. bao's POST /trexsql/{key}/cache is no longer called
  // from d2e; it remains in trex for standalone WebAPI.
  async refreshCache(
    datasetId: string,
    _schemaName: string,
    authToken?: string
  ): Promise<{ success: boolean; databaseCode: string; error?: string }> {
    const databaseCode = sanitizeIdForCacheId(datasetId)
    try {
      const { flowRunId } = await this.jobPluginsApi.createCacheFlowRun(datasetId, authToken)
      this.cacheFlowRuns.set(datasetId, flowRunId)
      return { success: true, databaseCode }
    } catch (error) {
      return { success: false, databaseCode, error: (error as Error).message }
    }
  }

  // Kick off the cache build without waiting for it. waitForCacheReady below
  // exists for a consumer that needs a hot cache before proceeding, but has no
  // callers yet.
  private async triggerCacheCreation(
    datasetId: string,
    schemaName: string,
    authToken?: string
  ): Promise<void> {
    const result = await this.refreshCache(datasetId, schemaName, authToken)
    if (!result.success) {
      this.logger.warn(`Cache flow run failed to start for ${datasetId}: ${result.error}`)
    }
  }

  // Block until the cache for the given dataset is built. Currently unused — grep
  // confirms no callers — but intended for a consumer that needs a hot cache before
  // proceeding (e.g. before dispatching downstream work against the cache catalog).
  async waitForCacheReady(
    datasetId: string,
    authToken?: string,
    options: { timeoutMs?: number; pollIntervalMs?: number } = {}
  ): Promise<void> {
    const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000
    const pollIntervalMs = options.pollIntervalMs ?? 2000
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const status = await this.getCacheStatus(datasetId, authToken)
      if (status.activeJobStatus === 'FAILED') {
        throw new Error(`Cache build for ${datasetId} failed: ${status.lastJobError}`)
      }
      if (status.ready) return
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
    throw new Error(`Cache build for ${datasetId} did not become ready within ${timeoutMs}ms`)
  }

  // Snapshot the cache build state for a dataset. Callers poll this and decide when
  // it is safe to query the cache catalog.
  //
  // bao reported cacheExists/cacheAttached by stat-ing the file; the flow reports
  // neither, so both are derived from the run reaching COMPLETED. lastModified comes
  // from the flow run's end_time, and is only ever populated once the run has
  // COMPLETED (getFlowRunState returns endTime for other terminal/in-flight states
  // too when Prefect has one, but we deliberately only surface it on success).
  async getCacheStatus(datasetId: string, authToken?: string): Promise<{
    ready: boolean
    cacheExists: boolean
    cacheAttached: boolean
    lastModified: number | null
    activeJobStatus?: string | null
    lastJobError?: string | null
  }> {
    const flowRunId = this.cacheFlowRuns.get(datasetId)
    if (!flowRunId) {
      return {
        ready: false,
        cacheExists: false,
        cacheAttached: false,
        lastModified: null,
        activeJobStatus: null,
        lastJobError: null,
      }
    }
    const { state, endTime } = await this.jobPluginsApi.getFlowRunState(flowRunId, authToken)
    const ready = state === 'COMPLETED'
    return {
      ready,
      cacheExists: ready,
      cacheAttached: ready,
      lastModified: ready ? endTime : null,
      activeJobStatus: state,
      lastJobError: state === 'FAILED' ? `Cache flow run ${flowRunId} failed` : null,
    }
  }

  async deleteSourceForDataset(datasetId: string, authToken?: string): Promise<void> {
    try {
      const existing = await this.webApiSourceApi.getSourceByKey(datasetId, authToken)
      if (existing) {
        // Deletes the source and cascades to its source_daimon rows.
        await this.webApiSourceApi.deleteSource(existing.sourceId, authToken)
      }

      // The "Source user (<id>)" role is auto-created on source creation but is not removed by DELETE /source
      const roles = await this.webApiSourceApi.getRoles(authToken)
      const role = findRoleByName(roles, sourceUserRoleName(datasetId))
      if (role) {
        await this.webApiSourceApi.deleteRole(role.id, authToken)
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
    const key = dialect?.toLowerCase()
    return dialectMap[key] ?? key
  }

  private buildJdbcUrl(credentials: IDbCredentials): string {
    const { host, port, database, dialect } = credentials

    switch (dialect?.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        return `jdbc:postgresql://${host}:${port}/${database}`
      case 'hana':
        return `jdbc:sap://${host}:${port}/`
      case 'bigquery':
        // Simba BigQuery JDBC URL. The database entry carries the GCP project
        // in `host` and the default dataset in `name`/`database` (see the
        // admin UI's BigQueryForm). OAuthType=3 = application default
        // credentials: auth lives with the engine (the same model the DuckDB
        // bigquery scanner uses for the TrexSQL cache build), never in the
        // URL. bao's source_dsn parser requires the `ProjectId=` key — the
        // generic `jdbc:bigquery://host:port/db` form broke the cache path.
        return `jdbc:bigquery://https://www.googleapis.com/bigquery/v2:443;` +
          `ProjectId=${host};DefaultDataset=${database};OAuthType=3;`
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

    if (dataset.resultsSchemaName) {
      daimons.push({
        daimonType: 'Results',
        tableQualifier: dataset.resultsSchemaName,
        priority: 1,
      })
    }

    return daimons
  }
}
