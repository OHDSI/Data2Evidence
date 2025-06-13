/**
 * API service for concept set operations
 */
import axios from 'axios'
import { getPortalAPI } from '../../utils/PortalUtils'
import type {
  ConceptSetItem,
  ConceptItem,
  ConceptDetail,
  ApiConfig,
  ConceptSetDomainValues,
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
 * Load concept sets from the analytics service
 */
export const loadConceptSets = async (config: ApiConfig): Promise<ConceptSetDomainValues> => {
  if (!config || !config.configId || !config.datasetId) {
    console.warn('Missing configuration for concept set API call')
    return {
      values: [],
      isLoading: false,
      loadedStatus: 'NO_RESULTS',
    }
  }

  try {
    const headers = await buildApiHeaders(config.datasetId)
    const url = buildApiUrl('/analytics-svc/api/services/values')
    
    const response = await axios.get(url, {
      params: {
        attributePath: 'conceptSets',
        configId: config.configId,
        configVersion: config.configVersion,
        datasetId: config.datasetId,
        searchQuery: '',
        attributeType: 'conceptSet',
      },
      headers,
    })
    
    const values = response.status === 204 ? [] : response?.data?.data || []
    const formattedValues = values.map((item: any) => ({
      ...item,
      display_value: item.text || item.value,
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
 * Format concept detail for Atlas compatibility
 */
const formatConceptForAtlas = (conceptDetail: ConceptDetail, conceptId: number) => {
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
    isExcluded: false,
    includeDescendants: true,
    includeMapped: true,
  }
}

/**
 * Extract concept IDs from concept set data
 */
const extractConceptIds = (conceptSet: ConceptSetItem): number[] => {
  if (conceptSet.conceptIds && Array.isArray(conceptSet.conceptIds)) {
    return conceptSet.conceptIds
  } else if (conceptSet.concepts && Array.isArray(conceptSet.concepts)) {
    return conceptSet.concepts.map((c: ConceptItem) => c.id || c.concept_id || c.CONCEPT_ID).filter(Boolean) as number[]
  } else if (conceptSet.items && Array.isArray(conceptSet.items)) {
    return conceptSet.items
      .map((item: ConceptItem) => item.id || item.concept_id || item.CONCEPT_ID)
      .filter(Boolean) as number[]
  }
  return []
}

/**
 * Load concept set details for multiple concept sets
 */
export const loadConceptSetDetails = async (
  selectedConceptSets: ConceptSetItem[],
  config: ApiConfig
): Promise<Record<string, any[]>> => {
  if (selectedConceptSets.length === 0) {
    return {}
  }

  if (!config || !config.datasetId) {
    console.warn('Missing configuration for concept details API call')
    return {}
  }

  try {
    const headers = await buildApiHeaders()
    headers['Content-Type'] = 'application/json'

    const detailsMap: Record<string, any[]> = {}

    for (const conceptSet of selectedConceptSets) {
      const conceptSetId = conceptSet.value
      let conceptIds = extractConceptIds(conceptSet)

      if (conceptIds.length === 0) {
        console.warn(`No concept IDs found for concept set ${conceptSetId}, using sample IDs for demo`)
        conceptIds = [201820, 4329847, 4110056, 4112183, 4151281] // Sample diabetes-related concept IDs
      }

      if (conceptIds && conceptIds.length > 0) {
        const conceptDetails = []
        const limitedConceptIds = conceptIds.slice(0, 20)
        console.log(`Fetching details for concept set ${conceptSetId}:`, limitedConceptIds)

        for (const conceptId of limitedConceptIds) {
          try {
            const conceptDetail = await fetchConceptById(config.datasetId, conceptId, headers)
            if (conceptDetail) {
              console.log(`Concept detail response for ID ${conceptId}:`, conceptDetail)
              const formattedConcept = formatConceptForAtlas(conceptDetail, conceptId)
              console.log(`Formatted concept for ID ${conceptId}:`, formattedConcept)
              conceptDetails.push(formattedConcept)
            }
          } catch (error) {
            console.warn(`Failed to fetch concept details for ID ${conceptId}:`, error)
          }
        }

        detailsMap[conceptSetId] = conceptDetails
      } else {
        detailsMap[conceptSetId] = []
      }
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
export const loadSingleConceptSetDetails = async (
  conceptSet: ConceptSetItem,
  config: ApiConfig
): Promise<any[]> => {
  if (!config || !config.datasetId) {
    console.warn('Missing configuration for concept details API call')
    return []
  }

  try {
    const headers = await buildApiHeaders()
    headers['Content-Type'] = 'application/json'

    // Extract concept IDs from the concept set data
    let conceptIds = extractConceptIds(conceptSet)

    // For demo purposes, if no concept IDs found, use some sample IDs
    if (conceptIds.length === 0) {
      console.warn(`No concept IDs found for concept set ${conceptSet.value}, using sample IDs for demo`)
      conceptIds = [201820, 4329847, 4110056, 4112183, 4151281] // Sample diabetes-related concept IDs
    }

    const conceptDetails = []

    // Fetch details for each concept ID (limit to first 20 to avoid too many requests)
    const limitedConceptIds = conceptIds.slice(0, 20)
    console.log(`Fetching details for concept set ${conceptSet.value}:`, limitedConceptIds)

    for (const conceptId of limitedConceptIds) {
      try {
        const conceptDetail = await fetchConceptById(config.datasetId, conceptId, headers)
        if (conceptDetail) {
          // Format the concept detail in Atlas-compatible structure
          const formattedConcept = formatConceptForAtlas(conceptDetail, conceptId)
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