/**
 * API service for concept set operations
 */
import axios from 'axios'
import { getPortalAPI } from '../../utils/PortalUtils'
import type {
  ConceptSetItemDisplay,
  ConceptDetail,
  ConceptSetDomainValues,
  CreateConceptSetRequest,
  GetConceptSetsResponse,
  ConceptSetDetail,
} from '../types/ConceptSetTypes'

const buildApiHeaders = async (datasetId?: string): Promise<Record<string, string>> => {
  const portalAPI = getPortalAPI()
  const headers: Record<string, string> = {}

  const bearerToken = portalAPI ? await portalAPI.getToken() : localStorage.getItem('msaltoken')
  if (bearerToken != null) {
    headers['Authorization'] = `Bearer ${bearerToken}`
  }

  if (datasetId) {
    headers['datasetid'] = datasetId
  }

  return headers
}

const buildApiUrl = (path: string): string => {
  const portalAPI = getPortalAPI()

  if (portalAPI.qeSvcUrl) {
    return `${portalAPI.qeSvcUrl}${path}`
  } else {
    return `${process.env['VUE_APP_HOST']}${path}`
  }
}

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

    const response = await axios.get<GetConceptSetsResponse[]>(url, {
      params: {
        datasetId: datasetId,
      },
      headers,
    })

    const values = response.data
    const formattedValues = values.map(item => ({
      value: String(item.id),
      text: item.name,
      display_value: item.name,
      conceptIds: item.concepts?.map(c => c.id) || [],
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

const cachedConcepts: { [key: number]: ConceptDetail } = {}

export const fetchConceptById = async (
  datasetId: string,
  conceptId: number,
  headers: Record<string, string>
): Promise<ConceptDetail | null> => {
  try {
    if (cachedConcepts[conceptId]) {
      return cachedConcepts[conceptId]
    }
    const url = buildApiUrl('/terminology/concept/searchById')

    const requestBody = {
      datasetId: datasetId,
      conceptId: conceptId,
    }

    const response = await axios.post(url, requestBody, { headers })
    const data = response.data
    if (data[0]) {
      cachedConcepts[conceptId] = data[0]
    }
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error(`Error fetching concept by ID ${conceptId}:`, error)
    return null
  }
}

export const fetchConceptsByIds = async (
  datasetId: string,
  conceptIds: number[],
  headers: Record<string, string>,
  batchSize: number = 10
): Promise<Map<number, ConceptDetail | null>> => {
  const resultMap = new Map<number, ConceptDetail | null>()

  for (let i = 0; i < conceptIds.length; i += batchSize) {
    const batch = conceptIds.slice(i, i + batchSize)
    console.log(
      `Fetching concept details batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        conceptIds.length / batchSize
      )}: IDs ${batch.join(', ')}`
    )

    const batchPromises = batch.map(async conceptId => {
      try {
        const conceptDetail = await fetchConceptById(datasetId, conceptId, headers)
        return { conceptId, conceptDetail }
      } catch (error) {
        console.warn(`Failed to fetch concept details for ID ${conceptId}:`, error)
        return { conceptId, conceptDetail: null }
      }
    })

    const batchResults = await Promise.all(batchPromises)

    for (const { conceptId, conceptDetail } of batchResults) {
      resultMap.set(conceptId, conceptDetail)
    }
  }

  return resultMap
}

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

const extractConceptIds = (conceptSet: ConceptSetItemDisplay): number[] => {
  return conceptSet.conceptIds || []
}

export const loadConceptSetDetails = async (selectedConceptSets: ConceptSetItemDisplay[], datasetId: string) => {
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

    const detailsMap: { [key: string]: ConceptSetDetail[] } = {}

    const allConceptIds: number[] = []
    const conceptSetToConceptIds: Record<string, number[]> = {}

    for (const conceptSet of selectedConceptSets) {
      const conceptSetId = conceptSet.value
      let conceptIds = extractConceptIds(conceptSet)

      if (conceptIds.length === 0) {
        console.warn(`No concept IDs found for concept set ${conceptSetId}`)
        conceptSetToConceptIds[conceptSetId] = []
      } else {
        const limitedConceptIds = conceptIds.slice(0, 20)
        conceptSetToConceptIds[conceptSetId] = limitedConceptIds
        allConceptIds.push(...limitedConceptIds)
      }
    }

    if (allConceptIds.length === 0) {
      console.log('No concept IDs to fetch across all concept sets')
      return detailsMap
    }

    const uniqueConceptIds = [...new Set(allConceptIds)]
    console.log(
      `Fetching details for ${uniqueConceptIds.length} unique concepts across ${selectedConceptSets.length} concept sets`
    )

    const conceptDetailsMap = await fetchConceptsByIds(datasetId, uniqueConceptIds, headers, 10)

    for (const conceptSet of selectedConceptSets) {
      const conceptSetId = conceptSet.value
      const conceptIds = conceptSetToConceptIds[conceptSetId]
      const conceptDetails: ConceptSetDetail[] = []
      if (conceptIds) {
        for (const conceptId of conceptIds) {
          const conceptDetail = conceptDetailsMap.get(conceptId)
          if (conceptDetail) {
            console.log(`Using cached concept detail for ID ${conceptId}:`, conceptDetail)

            const conceptFlags = conceptSet.concepts?.find(c => c.id === conceptId)
            const formattedConcept = formatConceptForAtlas(conceptDetail, conceptId, conceptFlags)
            conceptDetails.push(formattedConcept)
          }
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

export const loadSingleConceptSetDetails = async (
  conceptSet: ConceptSetItemDisplay,
  datasetId: string
): Promise<ConceptSetDetail[]> => {
  if (!datasetId) {
    console.warn('Missing datasetId for concept details API call')
    return []
  }

  try {
    const headers = await buildApiHeaders()
    headers['Content-Type'] = 'application/json'

    let conceptIds = extractConceptIds(conceptSet)

    if (conceptIds.length === 0) {
      console.warn(`No concept IDs found for concept set ${conceptSet.value}`)
    }

    const conceptDetails: ConceptSetDetail[] = []

    const limitedConceptIds = conceptIds.slice(0, 20)
    console.log(`Fetching details for concept set ${conceptSet.value}:`, limitedConceptIds)

    for (const conceptId of limitedConceptIds) {
      try {
        const conceptDetail = await fetchConceptById(datasetId, conceptId, headers)
        if (conceptDetail) {
          const conceptFlags = conceptSet.concepts?.find(c => c.id === conceptId)
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

    return response.data
  } catch (error) {
    console.error('Error creating concept set:', error)
    throw error
  }
}
