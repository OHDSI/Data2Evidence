import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { DatasetCommandService } from './dataset-command.service.ts'
import { sanitizeIdForCacheId } from '../entity/dataset.entity.ts'

// Issue #2877 — cache_id assignment on the dataset write paths.
//
// These exercise the two things the entity-level tests cannot:
//   1. that the value PERSISTED to cache_id and the value handed to trex /attach agree
//      (they were computed by two hand-maintained copies of the rule and could drift), and
//   2. that a cache dataset (snapshot) gets its OWN catalog rather than inheriting the
//      source row's cache_id — which, now that a source row holds databaseCode, would
//      otherwise point the cache build at the source connection's catalog.

const SOURCE_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
const SNAPSHOT_ID = 'ab2504e0-4f89-11d3-9a0c-0305e82c9999'

interface Harness {
  svc: DatasetCommandService
  inserted: any[]
  attachCalls: any[]
}

function buildService(sourceDataset?: any): Harness {
  const inserted: any[] = []
  const attachCalls: any[] = []

  const entityMgr = {} as any
  const transactionRunner = {
    // deno-lint-ignore no-explicit-any
    run: (fn: any, arg: any) => fn(entityMgr, arg),
  }
  const datasetRepo = {
    // `create` is TypeORM's plain-object -> entity hydrator; a shallow copy is faithful
    // enough here because insertDataset (which we assert on) bypasses entity hooks anyway.
    create: (obj: any) => ({ ...obj }),
    insertDataset: (_mgr: any, entity: any) => {
      inserted.push(entity)
      return Promise.resolve(entity)
    },
    getDataset: (_id: string) => Promise.resolve(sourceDataset),
  }
  const detailRepo = {
    create: (obj: any) => ({ ...obj }),
    insertDetail: () => Promise.resolve(undefined),
    getDetail: () => Promise.resolve({ id: 'detail-1', name: 'Source DS' }),
  }
  const dashboardRepo = { create: (obj: any) => ({ ...obj }), insertDashboard: () => Promise.resolve(undefined) }
  const attributeRepo = {
    create: (obj: any) => ({ ...obj }),
    createAttribute: (datasetId: string, attr: any) => ({ datasetId, ...attr }),
    insertAttribute: () => Promise.resolve(undefined),
    getAttributeDto: () => Promise.resolve([]),
  }
  const tagRepo = {
    create: (obj: any) => ({ ...obj }),
    insertTag: () => Promise.resolve(undefined),
    getTags: () => Promise.resolve([]),
  }
  const requestContextService = {
    getAuthToken: () => ({ sub: 'user-1' }),
    getOriginalToken: () => 'Bearer token',
  }
  const trexApiService = {
    attach: (args: any) => {
      attachCalls.push(args)
      return Promise.resolve(undefined)
    },
  }

  const svc = new DatasetCommandService(
    transactionRunner as any,
    { getTenant: () => ({ id: 'tenant-1' }) } as any,
    datasetRepo as any,
    { getReleaseByDatasetIdAndName: () => Promise.resolve([]) } as any,
    detailRepo as any,
    dashboardRepo as any,
    attributeRepo as any,
    tagRepo as any,
    { getDatasetCode: () => Promise.resolve(null) } as any,
    { upsertDatasetCodeQuery: () => Promise.resolve(undefined) } as any,
    requestContextService as any,
    { syncSourceForDataset: () => Promise.resolve(undefined) } as any,
    trexApiService as any,
    { ensureDatasetRole: () => Promise.resolve(undefined) } as any,
  )

  return { svc, inserted, attachCalls }
}

function datasetDto(overrides: Record<string, unknown> = {}) {
  return {
    id: SOURCE_ID,
    type: 'source',
    tenantId: 'tenant-1',
    databaseCode: 'pg_db',
    cacheId: null,
    dialect: 'postgres',
    schemaName: 'cdm',
    vocabSchemaName: 'vocab',
    resultsSchemaName: 'results',
    dataModel: 'omop',
    paConfigId: 'pa-1',
    tokenDatasetCode: 'tok_1',
    detail: { name: 'Source DS' },
    dashboards: [],
    attributes: [],
    tags: [],
    ...overrides,
  } as any
}

describe('createDataset — cache_id assignment', () => {
  it('persists databaseCode as cache_id for a postgres source dataset', async () => {
    const { svc, inserted } = buildService()

    await svc.createDataset(datasetDto())

    assertEquals(inserted.length, 1)
    assertEquals(inserted[0].cacheId, 'pg_db')
  })

  it('hands trex /attach exactly the cache_id that was persisted (no drift)', async () => {
    const { svc, inserted, attachCalls } = buildService()

    await svc.createDataset(datasetDto())

    assertEquals(attachCalls.length, 1)
    assertEquals(attachCalls[0].cacheIds, [inserted[0].cacheId])
    assertEquals(attachCalls[0].cacheIds, ['pg_db'])
    assertEquals(attachCalls[0].connectionIds, ['pg_db'])
  })

  it('preserves the HANA rule for a hana source dataset', async () => {
    const { svc, inserted, attachCalls } = buildService()

    await svc.createDataset(datasetDto({ dialect: 'hana', databaseCode: 'HANA_DB' }))

    assertEquals(inserted[0].cacheId, 'HANA_DB')
    assertEquals(attachCalls[0].cacheIds, ['HANA_DB'])
  })

  it('honours an explicitly supplied cacheId', async () => {
    const { svc, inserted, attachCalls } = buildService()

    await svc.createDataset(datasetDto({ cacheId: 'explicit_catalog' }))

    assertEquals(inserted[0].cacheId, 'explicit_catalog')
    assertEquals(attachCalls[0].cacheIds, ['explicit_catalog'])
  })
})

describe('createDatasetSnapshot — cache dataset gets its own catalog', () => {
  function snapshotDto() {
    return {
      id: SNAPSHOT_ID,
      sourceDatasetId: SOURCE_ID,
      newDatasetName: 'My Cache',
      schemaName: 'cdm',
      timestamp: new Date(0),
      type: 'omop',
    } as any
  }

  it('does NOT inherit a postgres source row cache_id (which is now the databaseCode)', async () => {
    // Post-fix, the source row's cacheId is its databaseCode. Inheriting it would make the
    // cache build write into the source connection's catalog instead of its own.
    const { svc, inserted } = buildService({
      id: SOURCE_ID,
      tenantId: 'tenant-1',
      databaseCode: 'pg_db',
      cacheId: 'pg_db',
      dialect: 'postgres',
      type: 'source',
      vocabSchemaName: 'vocab',
      resultsSchemaName: 'results',
      tokenDatasetCode: 'tok_1',
      paConfigId: 'pa-1',
      dataModel: 'omop',
      plugin: null,
    })

    await svc.createDatasetSnapshot(snapshotDto())

    assertEquals(inserted.length, 1)
    assertEquals(inserted[0].cacheId, sanitizeIdForCacheId(SNAPSHOT_ID))
    assertEquals(inserted[0].cacheId === 'pg_db', false)
  })

  it('still inherits the source cache_id for HANA (queried directly, no DuckDB cache)', async () => {
    const { svc, inserted } = buildService({
      id: SOURCE_ID,
      tenantId: 'tenant-1',
      databaseCode: 'HANA_DB',
      cacheId: 'HANA_DB',
      dialect: 'hana',
      type: 'source',
      vocabSchemaName: 'VOCAB',
      resultsSchemaName: 'RESULTS',
      tokenDatasetCode: 'tok_1',
      paConfigId: 'pa-1',
      dataModel: 'omop',
      plugin: null,
    })

    await svc.createDatasetSnapshot(snapshotDto())

    assertEquals(inserted[0].cacheId, 'HANA_DB')
  })
})
