import { client } from './request'
import type {
  IWebapiConceptSet,
  ConceptSetExpression,
  CreateConceptSetRequest,
  ConceptDetail,
  IWebapiSource,
  CohortInfoResponse,
  NotificationsResponse,
  InclusionReportResponse,
} from '../types/ConceptSetTypes'
import type { InclusionReportResponse } from '../types/QueryFilterTypes'

const D2E_WEBAPI_BASE_URL = 'd2e-webapi'

// Cache and in-flight tracking for vocabulary search
const vocabularySearchCache: Map<string, ConceptDetail[]> = new Map()
const vocabularySearchInflight: Map<string, Promise<ConceptDetail[]>> = new Map()

export class D2eWebapiService {
  public async getConceptSets(datasetId: string): Promise<IWebapiConceptSet[]> {
    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/conceptset`,
      method: 'GET',
      headers: { datasetid: datasetId },
    })
    return response.data
  }

  public async getConceptSetExpression(conceptSetId: number, datasetId: string): Promise<ConceptSetExpression> {
    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/conceptset/${conceptSetId}/expression`,
      method: 'GET',
      headers: { datasetid: datasetId },
      params: { datasetId },
    })
    return response.data
  }

  public async createConceptSet(
    conceptSetData: CreateConceptSetRequest,
    datasetId: string,
    isAtlas?: boolean
  ): Promise<number> {
    // Step 1: Create the concept set
    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/conceptset`,
      method: 'POST',
      headers: {
        datasetid: datasetId,
        'Content-Type': 'application/json',
      },
      data: conceptSetData,
    })

    const conceptSetId = response.data.id

    // Step 2: Add concepts to the concept set if expression has items
    // Note that even though Step 1 may include the expression items, it is not saved, and this step is needed
    if (conceptSetData.expression?.items?.length > 0) {
      const conceptItems = conceptSetData.expression.items.map(item => ({
        conceptId: item.concept.CONCEPT_ID,
        isExcluded: item.isExcluded,
        includeDescendants: item.includeDescendants,
        includeMapped: item.includeMapped,
      }))

      await this.updateConceptSetItems(conceptSetId, conceptItems, datasetId, isAtlas)
    }

    return conceptSetId
  }

  public async updateConceptSetItems(
    conceptSetId: number,
    conceptItems: Array<{
      conceptId: number
      isExcluded: boolean
      includeDescendants: boolean
      includeMapped: boolean
    }>,
    datasetId: string,
    isAtlas?: boolean
  ): Promise<number | { statusCode: number }> {
    // Transform booleans to 0/1 only for Atlas WebAPI (when isAtlas = true)
    // d2e-webapi expects booleans, so only transform when needed
    const transformedItems = isAtlas
      ? conceptItems.map(item => ({
          conceptId: item.conceptId,
          isExcluded: item.isExcluded ? 1 : 0,
          includeDescendants: item.includeDescendants ? 1 : 0,
          includeMapped: item.includeMapped ? 1 : 0,
        }))
      : conceptItems

    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/conceptset/${conceptSetId}/items`,
      method: 'PUT',
      headers: { datasetid: datasetId },
      data: transformedItems,
    })
    return response.data
  }

  public async getConceptById(conceptId: number, datasetId: string): Promise<ConceptDetail[]> {
    // Create cache key: datasetId + concept ID
    const cacheKey = `${datasetId}:GET:${conceptId}`

    // Check cache first
    const cachedResult = vocabularySearchCache.get(cacheKey)
    if (cachedResult) {
      console.log(`[VocabularySearch] Using cached result for concept ID ${conceptId}`)
      return cachedResult
    }

    // Check if request is already in-flight
    const inflightRequest = vocabularySearchInflight.get(cacheKey)
    if (inflightRequest) {
      console.log(`[VocabularySearch] Waiting for in-flight request for concept ID ${conceptId}`)
      return await inflightRequest
    }

    // Create new request and track it
    console.log(`[VocabularySearch] Fetching concept ID ${conceptId} from API`)
    const requestPromise = (async () => {
      try {
        const response = await client({
          baseURL: D2E_WEBAPI_BASE_URL,
          url: `/vocabulary/${datasetId}/concept/${conceptId}`,
          method: 'GET',
          headers: { datasetid: datasetId },
        })

        // WebAPI returns concept with UPPERCASE field names, map to lowercase for ConceptDetail type
        const mapConceptToLowercase = (concept: any): ConceptDetail => ({
          concept_class_id: concept.CONCEPT_CLASS_ID,
          concept_code: concept.CONCEPT_CODE,
          concept_id: concept.CONCEPT_ID,
          concept_name: concept.CONCEPT_NAME,
          domain_id: concept.DOMAIN_ID,
          invalid_reason: concept.INVALID_REASON || null,
          standard_concept: concept.STANDARD_CONCEPT,
          vocabulary_id: concept.VOCABULARY_ID,
          valid_start_date: concept.VALID_START_DATE,
          valid_end_date: concept.VALID_END_DATE,
        })

        // WebAPI returns a single concept object, wrap it in an array for backward compatibility
        const conceptData = Array.isArray(response.data) ? response.data : [response.data]
        const result = conceptData.map(mapConceptToLowercase)

        // Cache the result
        vocabularySearchCache.set(cacheKey, result)

        return result
      } finally {
        // Remove from in-flight tracking when complete
        vocabularySearchInflight.delete(cacheKey)
      }
    })()

    // Store the promise in in-flight tracking
    vocabularySearchInflight.set(cacheKey, requestPromise)

    return await requestPromise
  }

  public async getSources(): Promise<IWebapiSource[]> {
    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/source/sources`,
      method: 'GET',
    })
    return response.data
  }

  public async getCohortInfo(cohortDefinitionId: number, datasetId: string): Promise<CohortInfoResponse> {
    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/cohortdefinition/${cohortDefinitionId}/info`,
      method: 'GET',
      headers: { datasetid: datasetId },
    })
    return response.data
  }

  public async getNotifications(hideStatuses?: string): Promise<NotificationsResponse> {
    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/notifications`,
      method: 'GET',
      params: hideStatuses ? { hide_statuses: hideStatuses } : undefined,
    })
    return response.data
  }

  public async getInclusionReport(
    cohortDefinitionId: number,
    sourceKey: string,
    modeId: number
  ): Promise<InclusionReportResponse> {
    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/cohortdefinition/${cohortDefinitionId}/report/${sourceKey}?mode=${modeId}`,
      method: 'GET',
      headers: { datasetid: sourceKey },
    })
    return response.data
  }
}

export const d2eWebapiService = new D2eWebapiService()

