/**
 * API service for concept set operations
 */
import axios from 'axios'
import { getPortalAPI } from '../../utils/PortalUtils'
import type {
  ConceptSetItem,
  ConceptDetail,
  ConceptSetDomainValues,
  CreateConceptSetRequest,
} from '../types/ConceptSetTypes'

/**
 * Build authentication headers for API requests
 */
const buildApiHeaders = async (datasetId?: string): Promise<Record<string, string>> => {
  const portalAPI = getPortalAPI()
  const headers: Record<string, string> = {}

  const bearerToken = portalAPI ? await portalAPI.getToken() : localStorage.getItem('msaltoken')
  if (bearerToken != null) {
    headers.Authorization = `Bearer ${bearerToken}`
  }

  if (datasetId) {
    headers.datasetid = datasetId
  }

  return headers
}

/**
 * Build API URL with proper host configuration
 */
const buildApiUrl = (path: string): string => {
  const portalAPI = getPortalAPI()

  if (portalAPI.qeSvcUrl) {
    return `${portalAPI.qeSvcUrl}${path}`
  } else {
    return `${process.env.VUE_APP_HOST}${path}`
  }
}

/**
 * Load concept sets from the terminology service
 */
export const loadConceptSets = async (datasetId: string): Promise<ConceptSetDomainValues> => {
  if (!datasetId) {
    console.warn('Missing datasetId for concept set API call')
    return {
      values: [],
      isLoading: false,
      loadedStatus: 'NO_RESULTS',
    }
  }

  try {
    const headers = await buildApiHeaders(datasetId)
    const url = buildApiUrl('/terminology/concept-set')

    const response = await axios.get(url, {
      params: {
        datasetId: datasetId,
      },
      headers,
    })

    const values = response.status === 204 ? [] : response?.data || []
    const formattedValues = values.map((item: any) => ({
      value: item.id,
      text: item.name,
      display_value: item.name,
      conceptIds: item.concepts?.map((c: any) => c.id) || [],
      concepts: item.concepts || [],
      shared: item.shared,
      userName: item.userName,
      createdDate: item.createdDate,
      modifiedDate: item.modifiedDate,
    }))

    const loadedStatus =
      response.status === 204 ? 'TOO_MANY_RESULTS' : values.length === 0 ? 'NO_RESULTS' : 'HAS_RESULTS'

    return {
      values: formattedValues,
      isLoading: false,
      loadedStatus,
    }
  } catch (error) {
    console.error('Error loading concept sets:', error)
    return {
      values: [],
      isLoading: false,
      loadedStatus: 'NO_RESULTS',
    }
  }
}

/**
 * Fetch concept details by ID
 */
export const fetchConceptById = async (
  datasetId: string,
  conceptId: number,
  headers: Record<string, string>
): Promise<ConceptDetail | null> => {
  try {
    const url = buildApiUrl('/terminology/concept/searchById')

    const requestBody = {
      datasetId: datasetId,
      conceptId: conceptId,
    }

    const response = await axios.post(url, requestBody, { headers })
    const data = response.data
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error(`Error fetching concept by ID ${conceptId}:`, error)
    return null
  }
}

/**
 * Fetch multiple concept details by IDs in batches
 */
export const fetchConceptsByIds = async (
  datasetId: string,
  conceptIds: number[],
  headers: Record<string, string>,
  batchSize: number = 10
): Promise<Map<number, ConceptDetail | null>> => {
  const resultMap = new Map<number, ConceptDetail | null>()

  // Process concept IDs in batches
  for (let i = 0; i < conceptIds.length; i += batchSize) {
    const batch = conceptIds.slice(i, i + batchSize)
    console.log(
      `Fetching concept details batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        conceptIds.length / batchSize
      )}: IDs ${batch.join(', ')}`
    )

    // Create concurrent promises for this batch
    const batchPromises = batch.map(async conceptId => {
      try {
        const conceptDetail = await fetchConceptById(datasetId, conceptId, headers)
        return { conceptId, conceptDetail }
      } catch (error) {
        console.warn(`Failed to fetch concept details for ID ${conceptId}:`, error)
        return { conceptId, conceptDetail: null }
      }
    })

    // Wait for all concepts in this batch to complete
    const batchResults = await Promise.all(batchPromises)

    // Add results to the map
    for (const { conceptId, conceptDetail } of batchResults) {
      resultMap.set(conceptId, conceptDetail)
    }
  }

  return resultMap
}

/**
 * Format concept detail for Atlas compatibility
 */
const formatConceptForAtlas = (
  conceptDetail: ConceptDetail,
  conceptId: number,
  conceptFlags?: { useMapped?: boolean; isExcluded?: boolean; useDescendants?: boolean }
) => {
  return {
    concept: {
      CONCEPT_CLASS_ID: conceptDetail.concept_class_id,
      CONCEPT_CODE: conceptDetail.concept_code,
      CONCEPT_ID: conceptDetail.concept_id || conceptId,
      CONCEPT_NAME: conceptDetail.concept_name,
      DOMAIN_ID: conceptDetail.domain_id,
      INVALID_REASON: conceptDetail.invalid_reason || null,
      INVALID_REASON_CAPTION: conceptDetail.invalid_reason ? 'Invalid' : 'Valid',
      STANDARD_CONCEPT: conceptDetail.standard_concept,
      STANDARD_CONCEPT_CAPTION:
        conceptDetail.standard_concept === 'S'
          ? 'Standard'
          : conceptDetail.standard_concept === 'C'
          ? 'Classification'
          : 'Non-standard',
      VOCABULARY_ID: conceptDetail.vocabulary_id,
      VALID_START_DATE: conceptDetail.valid_start_date || '1970-01-01',
      VALID_END_DATE: conceptDetail.valid_end_date || '2099-12-31',
    },
    isExcluded: conceptFlags?.isExcluded ?? false,
    includeDescendants: conceptFlags?.useDescendants ?? true,
    includeMapped: conceptFlags?.useMapped ?? true,
  }
}

/**
 * Extract concept IDs from concept set data
 */
const extractConceptIds = (conceptSet: ConceptSetItem): number[] => {
  return conceptSet.conceptIds || []
}

/**
 * Load concept set details for multiple concept sets
 */
export const loadConceptSetDetails = async (
  selectedConceptSets: ConceptSetItem[],
  datasetId: string
): Promise<Record<string, any[]>> => {
  if (selectedConceptSets.length === 0) {
    return {}
  }

  if (!datasetId) {
    console.warn('Missing datasetId for concept details API call')
    return {}
  }

  try {
    const headers = await buildApiHeaders()
    headers['Content-Type'] = 'application/json'

    const detailsMap: Record<string, any[]> = {}

    // Collect all concept IDs that need to be fetched across all concept sets
    const allConceptIds: number[] = []
    const conceptSetToConceptIds: Record<string, number[]> = {}

    for (const conceptSet of selectedConceptSets) {
      const conceptSetId = conceptSet.value
      let conceptIds = extractConceptIds(conceptSet)

      if (conceptIds.length === 0) {
        console.warn(`No concept IDs found for concept set ${conceptSetId}`)
        conceptSetToConceptIds[conceptSetId] = []
      } else {
        // Limit to first 20 concepts per concept set to avoid too many requests
        const limitedConceptIds = conceptIds.slice(0, 20)
        conceptSetToConceptIds[conceptSetId] = limitedConceptIds
        allConceptIds.push(...limitedConceptIds)
      }
    }

    if (allConceptIds.length === 0) {
      console.log('No concept IDs to fetch across all concept sets')
      return detailsMap
    }

    // Remove duplicates
    const uniqueConceptIds = [...new Set(allConceptIds)]
    console.log(
      `Fetching details for ${uniqueConceptIds.length} unique concepts across ${selectedConceptSets.length} concept sets`
    )

    // Batch fetch all concept details
    const conceptDetailsMap = await fetchConceptsByIds(datasetId, uniqueConceptIds, headers, 10)

    // Process results for each concept set
    for (const conceptSet of selectedConceptSets) {
      const conceptSetId = conceptSet.value
      const conceptIds = conceptSetToConceptIds[conceptSetId]
      const conceptDetails = []

      for (const conceptId of conceptIds) {
        const conceptDetail = conceptDetailsMap.get(conceptId)
        if (conceptDetail) {
          console.log(`Using cached concept detail for ID ${conceptId}:`, conceptDetail)

          // Find the concept flags from the concept set
          const conceptFlags = conceptSet.concepts?.find((c: any) => c.id === conceptId)
          const formattedConcept = formatConceptForAtlas(conceptDetail, conceptId, conceptFlags)
          conceptDetails.push(formattedConcept)
        }
      }

      detailsMap[conceptSetId] = conceptDetails
    }

    console.log('Loaded concept set details (Atlas format):', detailsMap)
    return detailsMap
  } catch (error) {
    console.error('Error loading concept set details:', error)
    return {}
  }
}

/**
 * Load concept set details for a single concept set
 */
export const loadSingleConceptSetDetails = async (conceptSet: ConceptSetItem, datasetId: string): Promise<any[]> => {
  if (!datasetId) {
    console.warn('Missing datasetId for concept details API call')
    return []
  }

  try {
    const headers = await buildApiHeaders()
    headers['Content-Type'] = 'application/json'

    // Extract concept IDs from the concept set data
    let conceptIds = extractConceptIds(conceptSet)

    if (conceptIds.length === 0) {
      console.warn(`No concept IDs found for concept set ${conceptSet.value}`)
    }

    const conceptDetails = []

    // Fetch details for each concept ID (limit to first 20 to avoid too many requests)
    const limitedConceptIds = conceptIds.slice(0, 20)
    console.log(`Fetching details for concept set ${conceptSet.value}:`, limitedConceptIds)

    for (const conceptId of limitedConceptIds) {
      try {
        const conceptDetail = await fetchConceptById(datasetId, conceptId, headers)
        if (conceptDetail) {
          // Find the concept flags from the concept set
          const conceptFlags = conceptSet.concepts?.find((c: any) => c.id === conceptId)
          // Format the concept detail in Atlas-compatible structure
          const formattedConcept = formatConceptForAtlas(conceptDetail, conceptId, conceptFlags)
          conceptDetails.push(formattedConcept)
        }
      } catch (error) {
        console.warn(`Failed to fetch concept details for ID ${conceptId}:`, error)
      }
    }

    return conceptDetails
  } catch (error) {
    console.error('Error loading single concept set details:', error)
    return []
  }
}

/**
 * Create a new concept set
 */
export const createConceptSet = async (conceptSetData: CreateConceptSetRequest, datasetId: string): Promise<number> => {
  if (!datasetId) {
    throw new Error('Missing datasetId for concept set creation')
  }

  try {
    const headers = await buildApiHeaders(datasetId)
    headers['Content-Type'] = 'application/json'

    const url = buildApiUrl('/terminology/concept-set')

    const response = await axios.post(url, conceptSetData, {
      params: {
        datasetId: datasetId,
      },
      headers,
    })

    // Backend returns the created concept set ID
    return response.data
  } catch (error) {
    console.error('Error creating concept set:', error)
    throw error
  }
}
