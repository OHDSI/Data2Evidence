import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { DatasetCommandService } from './dataset-command.service.ts'

// WebAPI keeps its own copy of a source's daimons (CDM, Vocabulary, Results),
// written only by syncSourceForDataset. That ran on dataset creation and on
// transform-to-webapi and nowhere else, so a schema name edited afterwards never
// reached WebAPI: the source kept the daimons it was registered with. A source
// with no Results daimon registers happily and then fails on use --
//
//   java.lang.RuntimeException: DaimonType (Results) not found in Source
//     at CohortDefinitionService.getInclusionRuleReportSummary
//
// -- a 500 from inclusion-rule reports and cohort sampling, on a source that
// looks healthy in every picker. Two of twenty sources on develop were in that
// state, both for datasets that DO carry a results schema today.
//
// The edit path now re-syncs, but ONLY when the edit changed a daimon: a
// re-sync also triggers a TrexSQL cache build, and rebuilding the cache because
// someone fixed a typo in a description would be worse than the bug.

const DATASET_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'

interface Harness {
  svc: DatasetCommandService
  synced: string[]
  updated: any[]
}

function buildService(stored: Record<string, unknown>, syncFails = false): Harness {
  const synced: string[] = []
  const updated: any[] = []

  const detailRepoEntity = {
    findOne: () => Promise.resolve({ datasetId: DATASET_ID, name: 'DS' }),
    update: () => Promise.resolve(undefined),
  }
  const entityMgr = { getRepository: () => detailRepoEntity } as any

  const svc = new DatasetCommandService(
    { run: (fn: any, arg: any) => fn(entityMgr, arg) } as any,
    { getTenant: () => ({ id: 'tenant-1' }) } as any,
    {
      getDataset: () => Promise.resolve({ id: DATASET_ID, ...stored }),
      updateDataset: (_m: any, _id: string, entity: any) => {
        updated.push(entity)
        return Promise.resolve(undefined)
      },
    } as any,
    { getReleaseByDatasetIdAndName: () => Promise.resolve([]) } as any,
    { getDetail: () => Promise.resolve({ datasetId: DATASET_ID, name: 'DS' }) } as any,
    {
      find: () => Promise.resolve([]),
      deleteDashboard: () => Promise.resolve(undefined),
      insertDashboard: () => Promise.resolve(undefined),
    } as any,
    {
      getAttributeDto: () => Promise.resolve([]),
      createAttribute: (datasetId: string, attr: any) => ({ datasetId, ...attr }),
      deleteAttribute: () => Promise.resolve(undefined),
      insertAttribute: () => Promise.resolve(undefined),
      create: (obj: any) => ({ ...obj }),
    } as any,
    {
      getTags: () => Promise.resolve([]),
      deleteTag: () => Promise.resolve(undefined),
      insertTag: () => Promise.resolve(undefined),
      create: (obj: any) => ({ ...obj }),
    } as any,
    { getDatasetCode: () => Promise.resolve(null) } as any,
    { upsertDatasetCodeQuery: () => Promise.resolve(undefined) } as any,
    { getAuthToken: () => ({ sub: 'u' }), getOriginalToken: () => 'Bearer t' } as any,
    { syncSourceForDataset: () => Promise.resolve(undefined) } as any,
    { attach: () => Promise.resolve(undefined) } as any,
    { ensureDatasetRole: () => Promise.resolve(undefined) } as any,
  )

  // The seam under test is the DECISION to re-sync. syncWebApiSource itself
  // reaches getDbCredentialsByCode, which reads credentials from the Trex
  // runtime global and cannot be constructed here.
  ;(svc as any).syncWebApiSource = (id: string) => {
    synced.push(id)
    return syncFails
      ? Promise.reject(new Error('WebAPI unreachable'))
      : Promise.resolve({ id, synced: true })
  }

  return { svc, synced, updated }
}

function updateDto(overrides: Record<string, unknown> = {}) {
  return {
    id: DATASET_ID,
    type: 'webapi',
    tokenDatasetCode: 'tok_1',
    paConfigId: 'pa-1',
    visibilityStatus: 'PUBLIC',
    fhirDatasetId: null,
    detail: { name: 'DS' },
    dashboards: [],
    tags: [],
    attributes: [],
    ...overrides,
  } as any
}

const STORED = {
  dialect: 'postgres',
  schemaName: 'cdm',
  vocabSchemaName: 'vocab',
  resultsSchemaName: 'cdm_results',
  type: 'webapi',
  databaseCode: 'pg_db',
}

describe('updateDatasetDetailMetadata — keeping WebAPI daimons in step', () => {
  it('re-syncs when the results schema changes — the daimon that was missing', async () => {
    const { svc, synced } = buildService(STORED)
    await svc.updateDatasetDetailMetadata(updateDto({ resultsSchemaName: 'cdm_results_v2' }))
    assertEquals(synced, [DATASET_ID])
  })

  it('re-syncs when the vocabulary schema changes', async () => {
    const { svc, synced } = buildService(STORED)
    await svc.updateDatasetDetailMetadata(updateDto({ vocabSchemaName: 'vocab_v2' }))
    assertEquals(synced, [DATASET_ID])
  })

  // The reason the re-sync is conditional at all.
  it('does NOT re-sync an edit that touches no daimon, so no cache build is started', async () => {
    const { svc, synced } = buildService(STORED)
    await svc.updateDatasetDetailMetadata(updateDto({ detail: { name: 'A better description' } }))
    assertEquals(synced, [])
  })

  it('does NOT re-sync when the schema names are resent unchanged', async () => {
    const { svc, synced } = buildService(STORED)
    await svc.updateDatasetDetailMetadata(
      updateDto({ vocabSchemaName: 'vocab', resultsSchemaName: 'cdm_results' }),
    )
    assertEquals(synced, [])
  })

  // HANA schema names are upper-cased on write, so the stored value never
  // matches what the UI sends back. Comparing before that conversion would make
  // every HANA edit look like a daimon change and rebuild the cache each time.
  it('does NOT re-sync a HANA dataset resending the same name in another case', async () => {
    const { svc, synced } = buildService({
      ...STORED,
      dialect: 'hana',
      vocabSchemaName: 'VOCAB',
      resultsSchemaName: 'CDM_RESULTS',
    })
    await svc.updateDatasetDetailMetadata(
      updateDto({ vocabSchemaName: 'vocab', resultsSchemaName: 'cdm_results' }),
    )
    assertEquals(synced, [])
  })

  // The row is already committed by the time the re-sync runs. Failing the
  // request would report an edit as lost when it was saved.
  it('still reports the edit as saved when the re-sync fails', async () => {
    const { svc, synced, updated } = buildService(STORED, true)
    const result = await svc.updateDatasetDetailMetadata(
      updateDto({ resultsSchemaName: 'cdm_results_v2' }),
    )
    assertEquals(result, { id: DATASET_ID })
    assertEquals(synced, [DATASET_ID])
    assertEquals(updated.length, 1)
    assertEquals(updated[0].resultsSchemaName, 'cdm_results_v2')
  })
})
