import { describe, it } from '@std/testing/bdd'
import { assertEquals, assertRejects } from '@std/assert'
import { WebApiSourceService } from './webapi-source.service.ts'
import type { WebApiSourceApi } from './webapi-source.api.ts'
import type { Dataset } from '../dataset/entity/index.ts'
import type { DatasetDetail } from '../dataset/entity/dataset-detail.entity.ts'
import type { IDbCredentials } from './types.ts'
import { env } from '../env.ts'

type Call = { method: string; args: unknown[] }

// `otherSources` is what /source/sources returns besides this dataset's own
// source; pass an Error to make the lookup fail.
function createApiStub(existingSource: unknown = null, otherSources: unknown[] | Error = []) {
  const calls: Call[] = []
  const record = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args })
    if (method === 'getSourceByKey') return Promise.resolve(existingSource)
    if (method === 'getSources') {
      if (otherSources instanceof Error) return Promise.reject(otherSources)
      return Promise.resolve(existingSource ? [existingSource, ...otherSources] : otherSources)
    }
    if (method === 'getRoles') return Promise.resolve([])
    if (method === 'createCacheFlowRun') return Promise.resolve({ flowRunId: 'run-1' })
    return Promise.resolve(undefined)
  }
  const api: Partial<WebApiSourceApi> = {
    getSourceByKey: record('getSourceByKey'),
    getSources: record('getSources'),
    createSource: record('createSource'),
    updateSource: record('updateSource'),
    deleteSource: record('deleteSource'),
    getRoles: record('getRoles'),
    deleteRole: record('deleteRole'),
  }
  const jobPlugins = { createCacheFlowRun: record('createCacheFlowRun') }
  return { api, jobPlugins, calls, methods: () => calls.map((c) => c.method) }
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
    const { api, jobPlugins, calls, methods } = createApiStub()
    const service = new WebApiSourceService(api as never, jobPlugins as never)

    await service.syncSourceForDataset(datasetWithDialect('postgres'), detail, credentials)

    assertEquals(methods().includes('createSource'), true)
    const created = calls.find((c) => c.method === 'createSource')!
    const request = created.args[0] as {
      dialect: string
      daimons: { daimonType: string; priority: number }[]
    }
    assertEquals(request.dialect, 'postgresql')
    assertEquals(request.daimons.map((d) => d.daimonType), ['CDM', 'Vocabulary', 'Results'])
    // No other source holds a default yet, so this one becomes it: WebAPI
    // stores the priorities as sent and does not promote a 0 itself.
    assertEquals(request.daimons.map((d) => d.priority), [1, 1, 1])
  })

  it('leaves the default with the source that already has it when creating', async () => {
    const other = {
      sourceId: 7,
      sourceKey: 'other',
      daimons: [
        { sourceDaimonId: 9, daimonType: 'CDM', tableQualifier: 'cdm', priority: 1 },
        { sourceDaimonId: 10, daimonType: 'Vocabulary', tableQualifier: 'vocab', priority: 1 },
      ],
    }
    const { api, jobPlugins, calls } = createApiStub(null, [other])
    const service = new WebApiSourceService(api as never, jobPlugins as never)

    await service.syncSourceForDataset(datasetWithDialect('postgres'), detail, credentials)

    const created = calls.find((c) => c.method === 'createSource')!
    const request = created.args[0] as { daimons: { priority: number }[] }
    assertEquals(request.daimons.map((d) => d.priority), [0, 0, 1])
  })

  it('does not claim the default when the source list cannot be read', async () => {
    const { api, jobPlugins, calls } = createApiStub(null, new Error('502'))
    const service = new WebApiSourceService(api as never, jobPlugins as never)

    await service.syncSourceForDataset(datasetWithDialect('postgres'), detail, credentials)

    const created = calls.find((c) => c.method === 'createSource')!
    const request = created.args[0] as { daimons: { priority: number }[] }
    assertEquals(request.daimons.map((d) => d.priority), [0, 0, 1])
  })

  // Regression: BigQuery datasets got no WebAPI source at all — the credential
  // lookup 400'd on the missing username/password (service-account auth), and
  // the generic JDBC fallback URL lacked the ProjectId= key bao's cache DSN
  // parser requires.
  it('registers a source for a bigquery dataset with a Simba JDBC URL and no user/password', async () => {
    const { api, jobPlugins, calls, methods } = createApiStub()
    const service = new WebApiSourceService(api as never, jobPlugins as never)

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
    // The cache flow run is still triggered for the schema.
    assertEquals(methods().includes('createCacheFlowRun'), true)
    const cacheCall = calls.find((c) => c.method === 'createCacheFlowRun')!
    assertEquals(cacheCall.args[0], 'ds-1')
  })

  it('does not register a source for a hana dataset without a databaseCode', async () => {
    const { api, jobPlugins, methods } = createApiStub()
    const service = new WebApiSourceService(api as never, jobPlugins as never)

    await service.syncSourceForDataset(datasetWithDialect('hana'), detail, credentials)

    assertEquals(methods().includes('createSource'), false)
    assertEquals(methods().includes('updateSource'), false)
  })

  it('does not register a source for a duckdb dataset', async () => {
    const { api, jobPlugins, methods } = createApiStub()
    const service = new WebApiSourceService(api as never, jobPlugins as never)

    await service.syncSourceForDataset(datasetWithDialect('duckdb'), detail, credentials)

    assertEquals(methods().includes('createSource'), false)
    assertEquals(methods().includes('updateSource'), false)
  })

  it('leaves an existing source in place when the dialect is unsupported', async () => {
    const { api, jobPlugins, methods } = createApiStub({ sourceId: 17, sourceKey: 'ds-1' })
    const service = new WebApiSourceService(api as never, jobPlugins as never)

    await service.syncSourceForDataset(datasetWithDialect('duckdb'), detail, credentials)

    assertEquals(methods().includes('getSourceByKey'), true)
    assertEquals(methods().includes('createSource'), false)
    assertEquals(methods().includes('updateSource'), false)
    assertEquals(methods().includes('deleteSource'), false)
  })

  it('updates an existing source for a postgres dataset instead of creating one', async () => {
    const { api, jobPlugins, methods } = createApiStub({ sourceId: 42, sourceKey: 'ds-1' })
    const service = new WebApiSourceService(api as never, jobPlugins as never)

    await service.syncSourceForDataset(datasetWithDialect('postgres'), detail, credentials)

    assertEquals(methods().includes('updateSource'), true)
    assertEquals(methods().includes('createSource'), false)
  })

  // Regression: a re-sync sent priority 1 for every daimon, so after an admin
  // made another source the default vocabulary, re-syncing this dataset
  // silently took the default back.
  it('keeps the priorities WebAPI already has when updating a source', async () => {
    const { api, jobPlugins, calls } = createApiStub({
      sourceId: 42,
      sourceKey: 'ds-1',
      daimons: [
        { sourceDaimonId: 1, daimonType: 'CDM', tableQualifier: 'cdm', priority: 1 },
        { sourceDaimonId: 2, daimonType: 'Vocabulary', tableQualifier: 'vocab', priority: 0 },
        { sourceDaimonId: 3, daimonType: 'Results', tableQualifier: 'results', priority: 0 },
      ],
    })
    const service = new WebApiSourceService(api as never, jobPlugins as never)

    await service.syncSourceForDataset(datasetWithDialect('postgres'), detail, credentials)

    const updated = calls.find((c) => c.method === 'updateSource')!
    const request = updated.args[1] as { daimons: { daimonType: string; priority: number }[] }
    assertEquals(
      request.daimons.map((d) => [d.daimonType, d.priority]),
      [['CDM', 1], ['Vocabulary', 0], ['Results', 0]],
    )
  })

  it('uses the create defaults for a daimon the existing source does not have yet', async () => {
    const other = {
      sourceId: 7,
      sourceKey: 'other',
      daimons: [{ sourceDaimonId: 9, daimonType: 'Vocabulary', tableQualifier: 'vocab', priority: 1 }],
    }
    const { api, jobPlugins, calls } = createApiStub({
      sourceId: 42,
      sourceKey: 'ds-1',
      daimons: [
        { sourceDaimonId: 1, daimonType: 'CDM', tableQualifier: 'cdm', priority: 1 },
      ],
    }, [other])
    const service = new WebApiSourceService(api as never, jobPlugins as never)

    await service.syncSourceForDataset(datasetWithDialect('postgres'), detail, credentials)

    const updated = calls.find((c) => c.method === 'updateSource')!
    const request = updated.args[1] as { daimons: { daimonType: string; priority: number }[] }
    assertEquals(request.daimons.map((d) => d.priority), [1, 0, 1])
  })

  // HANA has no DuckDB cache on any dataset type (trex attaches the HANA database
  // itself), so a build triggered here would start a real Prefect flow run writing to
  // the live HANA connection's own alias.
  it('does not start a cache flow run for a hana dataset', async () => {
    const { api, jobPlugins, methods } = createApiStub()
    const service = new WebApiSourceService(api as never, jobPlugins as never)
    const previous = env.TREX__SQL_TOKEN
    env.TREX__SQL_TOKEN = 'quack-token'
    try {
      await service.syncSourceForDataset(
        { ...datasetWithDialect('hana'), databaseCode: 'HANA_DB' } as Dataset,
        detail,
        credentials,
      )
    } finally {
      env.TREX__SQL_TOKEN = previous
    }

    assertEquals(methods().includes('createCacheFlowRun'), false)
    assertEquals(methods().includes('createSource'), true)
  })
})

describe('WebApiSourceService.refreshCache', () => {
  it('starts a jobplugins cache flow run and reports success', async () => {
    const calls: unknown[] = []
    const jobPlugins = {
      createCacheFlowRun: (datasetId: string, token?: string) => {
        calls.push([datasetId, token])
        return Promise.resolve({ flowRunId: 'run-1' })
      },
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService({} as any, jobPlugins as any)
    const result = await svc.refreshCache('a-b-c', 'cdm', 'tok')
    assertEquals(result.success, true)
    assertEquals(result.databaseCode, 'a_b_c')
    assertEquals(calls, [['a-b-c', 'tok']])
  })

  it('reports failure with the error message when the flow cannot start', async () => {
    const jobPlugins = {
      createCacheFlowRun: () => Promise.reject(new Error('prefect down')),
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService({} as any, jobPlugins as any)
    const result = await svc.refreshCache('a-b-c', 'cdm', 'tok')
    assertEquals(result.success, false)
    assertEquals(result.error, 'prefect down')
  })

  function svcTracking(state: string, pruned?: boolean) {
    let created = 0
    const jobPlugins = {
      createCacheFlowRun: () => Promise.resolve({ flowRunId: `run-${++created}` }),
      getFlowRunState: () => Promise.resolve({ state, endTime: null, pruned }),
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService({} as any, jobPlugins as any)
    return { svc, created: () => created }
  }

  it('does not start a second flow run while one is still in flight', async () => {
    const { svc, created } = svcTracking('RUNNING')
    await svc.refreshCache('a-b-c', 'cdm', 'tok')
    const result = await svc.refreshCache('a-b-c', 'cdm', 'tok')
    assertEquals(result, { success: true, databaseCode: 'a_b_c', flowRunId: 'run-1' })
    assertEquals(created(), 1)
  })

  for (const state of ['COMPLETED', 'FAILED']) {
    it(`starts a new flow run once the previous one is ${state}`, async () => {
      const { svc, created } = svcTracking(state)
      await svc.refreshCache('a-b-c', 'cdm', 'tok')
      const result = await svc.refreshCache('a-b-c', 'cdm', 'tok')
      assertEquals(result.flowRunId, 'run-2')
      assertEquals(created(), 2)
    })
  }

  it('starts a new flow run once the previous one has been pruned from Prefect', async () => {
    const { svc, created } = svcTracking('UNKNOWN', true)
    await svc.refreshCache('a-b-c', 'cdm', 'tok')
    const result = await svc.refreshCache('a-b-c', 'cdm', 'tok')
    assertEquals(result.flowRunId, 'run-2')
    assertEquals(created(), 2)
  })

  it('keeps the previous flow run when its state is unknown', async () => {
    const { svc, created } = svcTracking('UNKNOWN')
    await svc.refreshCache('a-b-c', 'cdm', 'tok')
    const result = await svc.refreshCache('a-b-c', 'cdm', 'tok')
    assertEquals(result.flowRunId, 'run-1')
    assertEquals(created(), 1)
  })

  it('keeps the previous flow run when its state cannot be read', async () => {
    let created = 0
    const jobPlugins = {
      createCacheFlowRun: () => Promise.resolve({ flowRunId: `run-${++created}` }),
      getFlowRunState: () => Promise.reject(new Error('jobplugins down')),
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService({} as any, jobPlugins as any)
    await svc.refreshCache('a-b-c', 'cdm', 'tok')
    const result = await svc.refreshCache('a-b-c', 'cdm', 'tok')
    assertEquals(result.flowRunId, 'run-1')
    assertEquals(created, 1)
  })

  it('starts one flow run for overlapping calls', async () => {
    let created = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const jobPlugins = {
      createCacheFlowRun: async () => {
        created++
        await gate
        return { flowRunId: `run-${created}` }
      },
      getFlowRunState: () => Promise.resolve({ state: 'RUNNING', endTime: null }),
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService({} as any, jobPlugins as any)
    const first = svc.refreshCache('a-b-c', 'cdm', 'tok')
    const second = svc.refreshCache('a-b-c', 'cdm', 'tok')
    release()
    assertEquals((await first).flowRunId, 'run-1')
    assertEquals((await second).flowRunId, 'run-1')
    assertEquals(created, 1)
  })

  it('starts again after a failed start', async () => {
    let calls = 0
    const jobPlugins = {
      createCacheFlowRun: () =>
        ++calls === 1 ? Promise.reject(new Error('prefect down')) : Promise.resolve({ flowRunId: 'run-2' }),
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService({} as any, jobPlugins as any)
    assertEquals((await svc.refreshCache('a-b-c', 'cdm', 'tok')).success, false)
    assertEquals((await svc.refreshCache('a-b-c', 'cdm', 'tok')).flowRunId, 'run-2')
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

describe('WebApiSourceService.getCacheStatus via flow run', () => {
  function svcWith(state: string, flowRunId = 'run-1', endTime: number | null = null) {
    const jobPlugins = {
      createCacheFlowRun: () => Promise.resolve({ flowRunId }),
      getFlowRunState: () => Promise.resolve({ state, endTime }),
    }
    // deno-lint-ignore no-explicit-any
    return new WebApiSourceService({} as any, jobPlugins as any)
  }

  it('reports ready once the flow run completes', async () => {
    const svc = svcWith('COMPLETED')
    await svc.refreshCache('a-b-c', 'cdm', 'tok')
    const status = await svc.getCacheStatus('a-b-c', 'tok')
    assertEquals(status.ready, true)
    assertEquals(status.cacheExists, true)
    assertEquals(status.cacheAttached, true)
    assertEquals(status.activeJobStatus, 'COMPLETED')
  })

  it('surfaces the flow run end_time as lastModified once completed', async () => {
    const endTime = Date.parse('2026-09-01T12:00:00.000Z')
    const svc = svcWith('COMPLETED', 'run-1', endTime)
    await svc.refreshCache('a-b-c', 'cdm', 'tok')
    const status = await svc.getCacheStatus('a-b-c', 'tok')
    assertEquals(status.lastModified, endTime)
  })

  it('reports not ready while the flow run is still going', async () => {
    const svc = svcWith('RUNNING')
    await svc.refreshCache('a-b-c', 'cdm', 'tok')
    const status = await svc.getCacheStatus('a-b-c', 'tok')
    assertEquals(status.ready, false)
    assertEquals(status.cacheExists, false)
    assertEquals(status.lastModified, null)
  })

  it('surfaces a failed flow run as FAILED', async () => {
    const svc = svcWith('FAILED')
    await svc.refreshCache('a-b-c', 'cdm', 'tok')
    const status = await svc.getCacheStatus('a-b-c', 'tok')
    assertEquals(status.ready, false)
    assertEquals(status.activeJobStatus, 'FAILED')
    assertEquals(status.lastModified, null)
  })

  it('reports not ready when no run has been started for the dataset', async () => {
    const svc = svcWith('COMPLETED')
    const status = await svc.getCacheStatus('never-built', 'tok')
    assertEquals(status.ready, false)
    assertEquals(status.activeJobStatus, null)
  })
})

describe('WebApiSourceService trexsql cache sources', () => {
  const CACHE_ID = '_5ec7c9fe_1e4c_4c71_8a8d_921ba37875f7'

  function cachedDataset(overrides: Partial<Dataset> = {}): Dataset {
    return {
      id: '5ec7c9fe-1e4c-4c71-8a8d-921ba37875f7',
      dialect: 'postgres',
      cacheId: CACHE_ID,
      schemaName: 'demo_cdm',
      vocabSchemaName: 'demo_cdm',
      resultsSchemaName: 'demo_cdm_results',
      ...overrides,
    } as Dataset
  }

  function withToken<T>(token: string | undefined, fn: () => Promise<T>): Promise<T> {
    const previous = env.TREX__SQL_TOKEN
    env.TREX__SQL_TOKEN = token
    return fn().finally(() => {
      env.TREX__SQL_TOKEN = previous
    })
  }

  type Request = {
    dialect: string
    connectionString: string
    username: string
    password: string
    daimons: { daimonType: string; tableQualifier: string; priority: number }[]
  }

  async function createdRequest(dataset: Dataset, token: string | undefined = 'quack-token') {
    const { api, jobPlugins, calls } = createApiStub()
    const service = new WebApiSourceService(api as never, jobPlugins as never)
    await withToken(token, () => service.syncSourceForDataset(dataset, detail, credentials))
    return calls.find((c) => c.method === 'createSource')?.args[0] as Request | undefined
  }

  it('points a cached postgres dataset at the trexsql cache catalog', async () => {
    const request = (await createdRequest(cachedDataset()))!
    assertEquals(request.dialect, 'trexsql')
    assertEquals(request.connectionString, 'jdbc:trexsql://127.0.0.1:9494?disable_ssl=true')
    assertEquals(request.username, '')
    assertEquals(request.password, 'quack-token')
    assertEquals(
      request.daimons.map((d) => [d.daimonType, d.tableQualifier, d.priority]),
      [
        ['CDM', `${CACHE_ID}.demo_cdm`, 1],
        ['Vocabulary', `${CACHE_ID}.demo_cdm`, 1],
        ['Results', `${CACHE_ID}.demo_cdm_results`, 1],
      ],
    )
  })

  it('registers a cached duckdb dataset through trexsql', async () => {
    const request = (await createdRequest(cachedDataset({ dialect: 'duckdb' as never })))!
    assertEquals(request.dialect, 'trexsql')
  })

  it('keeps the direct JDBC request for a dataset without a cacheId', async () => {
    const request = (await createdRequest(cachedDataset({ cacheId: null })))!
    assertEquals(request.dialect, 'postgresql')
    assertEquals(request.connectionString, 'jdbc:postgresql://db:5432/alp')
    assertEquals(request.username, 'u')
    assertEquals(request.password, 'p')
    assertEquals(
      request.daimons.map((d) => d.tableQualifier),
      ['demo_cdm', 'demo_cdm', 'demo_cdm_results'],
    )
  })

  it('keeps the direct JDBC request without a token when the dataset has no cacheId', async () => {
    const request = (await createdRequest(cachedDataset({ cacheId: null }), undefined))!
    assertEquals(request.dialect, 'postgresql')
  })

  it('points a hana dataset at the read-only HANA catalog trex attaches', async () => {
    const request = (await createdRequest(cachedDataset({
      dialect: 'hana' as never,
      databaseCode: 'HANA_DB',
      cacheId: 'HANA_DB',
      schemaName: 'CDM',
      vocabSchemaName: 'VOCAB',
      resultsSchemaName: 'CDM_RESULTS',
    })))!
    assertEquals(request.dialect, 'trexsql')
    assertEquals(request.connectionString, 'jdbc:trexsql://127.0.0.1:9494?disable_ssl=true')
    assertEquals(request.password, 'quack-token')
    assertEquals(
      request.daimons.map((d) => [d.daimonType, d.tableQualifier]),
      [
        ['CDM', 'HANA_DB__srcdb.CDM'],
        ['Vocabulary', 'HANA_DB__srcdb.VOCAB'],
        ['Results', 'HANA_DB__srcdb.CDM_RESULTS'],
      ],
    )
  })

  it('refuses to register a cached dataset when TREX__SQL_TOKEN is not set', async () => {
    const { api, jobPlugins, methods } = createApiStub()
    const service = new WebApiSourceService(api as never, jobPlugins as never)
    await withToken(undefined, async () => {
      await assertRejects(
        () => service.syncSourceForDataset(cachedDataset(), detail, credentials),
        Error,
        'TREX__SQL_TOKEN is not set',
      )
    })
    assertEquals(methods().includes('createSource'), false)
    // Checked before any WebAPI round-trip, and the cache build still starts.
    assertEquals(methods().includes('getSourceByKey'), false)
    assertEquals(methods().includes('createCacheFlowRun'), true)
  })

  it('still starts the cache build when WebAPI rejects the source', async () => {
    const { api, jobPlugins, methods } = createApiStub()
    api.createSource = () => Promise.reject(new Error('500 boom'))
    const service = new WebApiSourceService(api as never, jobPlugins as never)
    await withToken('quack-token', async () => {
      await assertRejects(
        () => service.syncSourceForDataset(cachedDataset(), detail, credentials),
        Error,
        '500 boom',
      )
    })
    assertEquals(methods().includes('createCacheFlowRun'), true)
  })

  it('keeps the direct JDBC request when cacheId is the live source connection', async () => {
    const request = (await createdRequest(cachedDataset({ cacheId: 'pg_db', databaseCode: 'pg_db' })))!
    assertEquals(request.dialect, 'postgresql')
    assertEquals(request.connectionString, 'jdbc:postgresql://db:5432/alp')
    assertEquals(request.password, 'p')
    assertEquals(request.daimons.map((d) => d.tableQualifier), ['demo_cdm', 'demo_cdm', 'demo_cdm_results'])
  })

  it('reads the token from env.ts, which the portal worker env supplies', async () => {
    const request = (await createdRequest(cachedDataset(), 'from-env-ts'))!
    assertEquals(request.password, 'from-env-ts')
    const pkg = JSON.parse(await Deno.readTextFile(new URL('../../../package.json', import.meta.url)))
    assertEquals(pkg.trex.functions.env.portal.TREX__SQL_TOKEN, '${TREX__SQL_TOKEN}')
  })

  // The source is registered before the cache flow finishes; generation in that
  // window fails in WebAPI, and getCacheStatus is what callers poll for readiness.
  it('registers the source immediately and leaves readiness to getCacheStatus', async () => {
    const { api, calls, methods } = createApiStub()
    const jobPlugins = {
      createCacheFlowRun: () => Promise.resolve({ flowRunId: 'run-1' }),
      getFlowRunState: () => Promise.resolve({ state: 'RUNNING', endTime: null }),
    }
    const service = new WebApiSourceService(api as never, jobPlugins as never)
    const dataset = cachedDataset()
    await withToken('quack-token', () => service.syncSourceForDataset(dataset, detail, credentials))

    assertEquals(methods().includes('createSource'), true)
    assertEquals((calls.find((c) => c.method === 'createSource')!.args[0] as Request).dialect, 'trexsql')
    assertEquals((await service.getCacheStatus(dataset.id)).ready, false)
  })
})

describe('WebApiSourceService.resyncAllSources', () => {
  it('reports a WebAPI error for one dataset and continues', async () => {
    const { api, jobPlugins } = createApiStub()
    let n = 0
    api.createSource = () => (++n === 1 ? Promise.reject(new Error('500 boom')) : Promise.resolve(undefined as never))
    const targets = ['a', 'b'].map((id) => ({
      dataset: { ...datasetWithDialect('postgres'), id },
      detail,
      credentials,
    }))
    const loader = { listSyncTargets: () => Promise.resolve(targets) }
    const service = new WebApiSourceService(api as never, jobPlugins as never, loader as never)

    const result = await service.resyncAllSources()

    assertEquals(result.synced, ['b'])
    assertEquals(result.failed.length, 1)
    assertEquals(result.failed[0].id, 'a')
    assertEquals(result.failed[0].error.includes('500 boom'), true)
    // The logged sync error is flushed by winston on a timer; let it run.
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('reports a failing dataset without aborting the others', async () => {
    const { api, jobPlugins, calls } = createApiStub()
    const targets = [
      { dataset: { ...datasetWithDialect('postgres'), id: 'ok-1' }, detail, credentials },
      { dataset: { ...datasetWithDialect('postgres'), id: 'no-creds' }, detail, credentials: null },
      { dataset: { ...datasetWithDialect('postgres'), id: 'ok-2' }, detail, credentials },
    ]
    const loader = { listSyncTargets: () => Promise.resolve(targets) }
    const service = new WebApiSourceService(api as never, jobPlugins as never, loader as never)

    const result = await service.resyncAllSources('tok')

    assertEquals(result.synced, ['ok-1', 'ok-2'])
    assertEquals(result.failed.map((f) => f.id), ['no-creds'])
    assertEquals(result.failed[0].error.includes('credentials'), true)
    const keys = calls
      .filter((c) => c.method === 'createSource')
      .map((c) => (c.args[0] as { key: string }).key)
    assertEquals(keys, ['ok-1', 'ok-2'])
  })
})
