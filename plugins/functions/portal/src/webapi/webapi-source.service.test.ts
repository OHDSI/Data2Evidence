import { assertEquals } from '@std/assert'
import { WebApiSourceService } from './webapi-source.service.ts'
import type { Dataset } from '../dataset/entity/index.ts'
import type { DatasetDetail } from '../dataset/entity/dataset-detail.entity.ts'
import type { IDbCredentials } from './types.ts'

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
  const api = {
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

Deno.test('registers a source for a postgres dataset', async () => {
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

Deno.test('deleteSourceForDataset removes the source', async () => {
  const { api, methods } = createApiStub({ sourceId: 17, sourceKey: 'ds-1' })
  const service = new WebApiSourceService(api as never)

  await service.deleteSourceForDataset('ds-1')

  assertEquals(methods().includes('deleteSource'), true)
})

Deno.test('does not register a source for a hana dataset', async () => {
  const { api, methods } = createApiStub()
  const service = new WebApiSourceService(api as never)

  await service.syncSourceForDataset(datasetWithDialect('hana'), detail, credentials)

  assertEquals(methods().includes('createSource'), false)
  assertEquals(methods().includes('updateSource'), false)
})

Deno.test('does not register a source for a duckdb dataset', async () => {
  const { api, methods } = createApiStub()
  const service = new WebApiSourceService(api as never)

  await service.syncSourceForDataset(datasetWithDialect('duckdb'), detail, credentials)

  assertEquals(methods().includes('createSource'), false)
  assertEquals(methods().includes('updateSource'), false)
})

Deno.test('leaves an existing source in place when the dialect is unsupported', async () => {
  const { api, methods } = createApiStub({ sourceId: 17, sourceKey: 'ds-1' })
  const service = new WebApiSourceService(api as never)

  await service.syncSourceForDataset(datasetWithDialect('hana'), detail, credentials)

  assertEquals(methods().includes('getSourceByKey'), true)
  assertEquals(methods().includes('createSource'), false)
  assertEquals(methods().includes('updateSource'), false)
  assertEquals(methods().includes('deleteSource'), false)
})
