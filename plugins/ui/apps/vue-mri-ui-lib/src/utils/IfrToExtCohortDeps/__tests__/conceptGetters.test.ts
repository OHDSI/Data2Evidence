import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api', () => ({
  api: {
    terminology: {
      getConceptsFromConceptSet: vi.fn(),
    },
    d2eWebapi: {
      getIncludedConcepts: vi.fn(),
    },
    paConfigSvc: {},
  },
}))

import { api } from '../api'
import { getConceptsFromConceptSet } from '../conceptGetters'

const terminologyConceptSetResponse = {
  concepts: [
    {
      conceptId: 101,
      display: 'Legacy Concept',
      domainId: 'Condition',
      system: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      code: 'legacy-code',
      validStartDate: '2020-01-01',
      validEndDate: '2099-12-31',
      validity: 'V',
      useMapped: true,
      useDescendants: true,
      isExcluded: false,
    },
  ],
}

const includedConceptsResponse = [
  {
    CONCEPT_ID: 201,
    CONCEPT_NAME: 'WebAPI Concept',
    DOMAIN_ID: 'Condition',
    VOCABULARY_ID: 'SNOMED',
    CONCEPT_CLASS_ID: 'Clinical Finding',
    STANDARD_CONCEPT: 'S',
    CONCEPT_CODE: 'webapi-code',
    VALID_START_DATE: 1577836800000,
    VALID_END_DATE: 4102444800000,
    INVALID_REASON: null,
    USEMAPPED: false,
    USEDESCENDANTS: true,
  },
]

describe('utils/IfrToExtCohortDeps/conceptGetters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves legacy concept sets through terminology-svc using the external id', async () => {
    ;(api.terminology.getConceptsFromConceptSet as any).mockResolvedValue(terminologyConceptSetResponse)

    const result = await getConceptsFromConceptSet({ conceptSetId: 'legacy:5', datasetId: 'dataset-1' })

    expect(api.terminology.getConceptsFromConceptSet).toHaveBeenCalledWith(5, 'dataset-1')
    expect(api.d2eWebapi.getIncludedConcepts).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
    expect(result![0].CONCEPT_ID).toBe(101)
    expect(result![0].CONCEPT_NAME).toBe('Legacy Concept')
    expect(result![0].USEMAPPED).toBe(true)
    expect(result![0].USEDESCENDANTS).toBe(true)
  })

  it('resolves bare numeric ids as legacy for back-compat', async () => {
    ;(api.terminology.getConceptsFromConceptSet as any).mockResolvedValue(terminologyConceptSetResponse)

    await getConceptsFromConceptSet({ conceptSetId: '5', datasetId: 'dataset-1' })

    expect(api.terminology.getConceptsFromConceptSet).toHaveBeenCalledWith(5, 'dataset-1')
    expect(api.d2eWebapi.getIncludedConcepts).not.toHaveBeenCalled()
  })

  it('resolves webapi concept sets through the d2e-webapi facade', async () => {
    ;(api.d2eWebapi.getIncludedConcepts as any).mockResolvedValue(includedConceptsResponse)

    const result = await getConceptsFromConceptSet({ conceptSetId: 'webapi:2', datasetId: 'dataset-1' })

    expect(api.d2eWebapi.getIncludedConcepts).toHaveBeenCalledWith(['webapi:2'], 'dataset-1')
    expect(api.terminology.getConceptsFromConceptSet).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
    expect(result![0].CONCEPT_ID).toBe(201)
    expect(result![0].CONCEPT_NAME).toBe('WebAPI Concept')
    expect(result![0].USEMAPPED).toBe(false)
    expect(result![0].USEDESCENDANTS).toBe(true)
  })

  it('resolves offset-encoded numeric ids as webapi for back-compat', async () => {
    ;(api.d2eWebapi.getIncludedConcepts as any).mockResolvedValue(includedConceptsResponse)

    await getConceptsFromConceptSet({ conceptSetId: '1000000002', datasetId: 'dataset-1' })

    expect(api.d2eWebapi.getIncludedConcepts).toHaveBeenCalledWith(['webapi:2'], 'dataset-1')
    expect(api.terminology.getConceptsFromConceptSet).not.toHaveBeenCalled()
  })

  it('returns null when a webapi concept set resolves to no concepts', async () => {
    ;(api.d2eWebapi.getIncludedConcepts as any).mockResolvedValue([])

    const result = await getConceptsFromConceptSet({ conceptSetId: 'webapi:2', datasetId: 'dataset-1' })

    expect(result).toBeNull()
  })
})
