import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { WebApiSourceService } from './webapi-source.service.ts'
import type { WebApiSourceApi } from './webapi-source.api.ts'
import type { Dataset } from '../dataset/entity/index.ts'
import type { DatasetDetail } from '../dataset/entity/dataset-detail.entity.ts'
import type { IDbCredentials } from './types.ts'

function makeService(cacheStatus: unknown, createCacheResult?: unknown) {
  const api = {
    getCacheStatus: () => Promise.resolve(cacheStatus),
    createCache: () => Promise.resolve(createCacheResult),
  }
  // deno-lint-ignore no-explicit-any
  return new WebApiSourceService(api as any)
}

describe('WebApiSourceService.getCacheStatus', () => {
  it('passes lastModified through and reports ready when built', async () => {
    const svc = makeService({
      cacheExists: true,
      cacheAttached: true,
      lastModified: 1782194854916,
      activeJob: null,
    })
    const status = await svc.getCacheStatus('key')
    assertEquals(status.ready, true)
    assertEquals(status.lastModified, 1782194854916)
    assertEquals(status.cacheExists, true)
    assertEquals(status.cacheAttached, true)
  })

  it('reports not-ready and null lastModified when no cache exists', async () => {
    const svc = makeService({ cacheExists: false, cacheAttached: false })
    const status = await svc.getCacheStatus('key')
    assertEquals(status.ready, false)
    assertEquals(status.lastModified, null)
  })
})

describe('WebApiSourceService.refreshCache', () => {
  it('delegates to createCache with sourceKey, schemaName and authToken and returns its result', async () => {
    const stubResult = { success: true, databaseCode: '_ds1' }
    let capturedArgs: unknown[] = []
    const api = {
      getCacheStatus: () => Promise.resolve({}),
      createCache: (...args: unknown[]) => {
        capturedArgs = args
        return Promise.resolve(stubResult)
      },
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService(api as any)
    const result = await svc.refreshCache('ds1', 'cdm_x_123', 'Bearer t')
    assertEquals(result, stubResult)
    assertEquals(capturedArgs, ['ds1', 'cdm_x_123', 'Bearer t'])
  })

  it('propagates a failure result from createCache', async () => {
    const stubResult = { success: false, databaseCode: '_ds1', error: 'boom' }
    const api = {
      getCacheStatus: () => Promise.resolve({}),
      createCache: () => Promise.resolve(stubResult),
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService(api as any)
    const result = await svc.refreshCache('ds1', 'cdm_x_123', 'Bearer t')
    assertEquals(result, stubResult)
  })
})

type Call = { method: string; args: unknown[] }

function createApiStub(existingSource: unknown = null) {
  const calls: Call[] = []
  const record = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args })
    if (method === 'getSourceByKey') return Promise.resolve(existingSource)
    if (method === 'getRoles') return Promise.resolve([])
    if (method === 'createCache') return Promise.resolve({ success: true })
    return Promise.resolve(undefined)
  }
  const api: Partial<WebApiSourceApi> = {
    getSourceByKey: record('getSourceByKey'),
    createSource: record('createSource'),
    updateSource: record('updateSource'),
    createCache: record('createCache'),
    deleteSource: record('deleteSource'),
    getRoles: record('getRoles'),
    deleteRole: record('deleteRole'),
  }
  return { api, calls, methods: () => calls.map((c) => c.method) }
}

const credentials: IDbCredentials = {
  host: 'db',
  port: 5432,
  database: 'alp',
  dialect: 'postgres',
  username: 'u',
  password: 'p',
}

function datasetWithDialect(dialect: string): Dataset {
  return {
    id: 'ds-1',
    dialect,
    schemaName: 'cdm',
    vocabSchemaName: 'vocab',
    resultsSchemaName: 'results',
  } as Dataset
}

const detail = { name: 'Test dataset' } as DatasetDetail

describe('WebApiSourceService.syncSourceForDataset', () => {
  it('registers a source for a postgres dataset', async () => {
    const { api, calls, methods } = createApiStub()
    const service = new WebApiSourceService(api as never)

    await service.syncSourceForDataset(datasetWithDialect('postgres'), detail, credentials)

    assertEquals(methods().includes('createSource'), true)
    const created = calls.find((c) => c.method === 'createSource')!
    const request = created.args[0] as {
      dialect: string
      daimons: { daimonType: string; priority: number }[]
    }
    assertEquals(request.dialect, 'postgresql')
    assertEquals(request.daimons.map((d) => d.daimonType), ['CDM', 'Vocabulary', 'Results'])
    assertEquals(request.daimons.map((d) => d.priority), [1, 1, 1])
  })

  // Regression: BigQuery datasets got no WebAPI source at all — the credential
  // lookup 400'd on the missing username/password (service-account auth), and
  // the generic JDBC fallback URL lacked the ProjectId= key bao's cache DSN
  // parser requires.
  it('registers a source for a bigquery dataset with a Simba JDBC URL and no user/password', async () => {
    const { api, calls, methods } = createApiStub()
    const service = new WebApiSourceService(api as never)

    const bqCredentials: IDbCredentials = {
      host: 'my-gcp-project', // BigQuery entries carry the project in `host`
      port: 443,
      database: 'my_dataset', // ...and the default dataset in `database`
      dialect: 'bigquery',
      username: '',
      password: '',
    }

    await service.syncSourceForDataset(datasetWithDialect('bigquery'), detail, bqCredentials)

    assertEquals(methods().includes('createSource'), true)
    const created = calls.find((c) => c.method === 'createSource')!
    const request = created.args[0] as {
      dialect: string
      connectionString: string
      daimons: { daimonType: string }[]
    }
    assertEquals(request.dialect, 'bigquery')
    assertEquals(
      request.connectionString,
      'jdbc:bigquery://https://www.googleapis.com/bigquery/v2:443;' +
        'ProjectId=my-gcp-project;DefaultDataset=my_dataset;OAuthType=3;',
    )
    assertEquals(request.daimons.map((d) => d.daimonType), ['CDM', 'Vocabulary', 'Results'])
    // The cache build is still triggered for the schema.
    assertEquals(methods().includes('createCache'), true)
  })

  it('does not register a source for a hana dataset', async () => {
    const { api, methods } = createApiStub()
    const service = new WebApiSourceService(api as never)

    await service.syncSourceForDataset(datasetWithDialect('hana'), detail, credentials)

    assertEquals(methods().includes('createSource'), false)
    assertEquals(methods().includes('updateSource'), false)
  })

  it('does not register a source for a duckdb dataset', async () => {
    const { api, methods } = createApiStub()
    const service = new WebApiSourceService(api as never)

    await service.syncSourceForDataset(datasetWithDialect('duckdb'), detail, credentials)

    assertEquals(methods().includes('createSource'), false)
    assertEquals(methods().includes('updateSource'), false)
  })

  it('leaves an existing source in place when the dialect is unsupported', async () => {
    const { api, methods } = createApiStub({ sourceId: 17, sourceKey: 'ds-1' })
    const service = new WebApiSourceService(api as never)

    await service.syncSourceForDataset(datasetWithDialect('hana'), detail, credentials)

    assertEquals(methods().includes('getSourceByKey'), true)
    assertEquals(methods().includes('createSource'), false)
    assertEquals(methods().includes('updateSource'), false)
    assertEquals(methods().includes('deleteSource'), false)
  })

  it('updates an existing source for a postgres dataset instead of creating one', async () => {
    const { api, methods } = createApiStub({ sourceId: 42, sourceKey: 'ds-1' })
    const service = new WebApiSourceService(api as never)

    await service.syncSourceForDataset(datasetWithDialect('postgres'), detail, credentials)

    assertEquals(methods().includes('updateSource'), true)
    assertEquals(methods().includes('createSource'), false)
  })

  it('still builds the TrexSQL cache for a hana dataset despite skipping source registration', async () => {
    const { api, methods } = createApiStub()
    const service = new WebApiSourceService(api as never)

    await service.syncSourceForDataset(datasetWithDialect('hana'), detail, credentials)

    assertEquals(methods().includes('createCache'), true)
    assertEquals(methods().includes('createSource'), false)
    assertEquals(methods().includes('updateSource'), false)
  })
})

describe('WebApiSourceService.deleteSourceForDataset', () => {
  it('removes the source', async () => {
    const { api, methods } = createApiStub({ sourceId: 17, sourceKey: 'ds-1' })
    const service = new WebApiSourceService(api as never)

    await service.deleteSourceForDataset('ds-1')

    assertEquals(methods().includes('deleteSource'), true)
  })
})
