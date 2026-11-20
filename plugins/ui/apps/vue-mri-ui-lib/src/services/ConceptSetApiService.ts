/**
 * API service for concept set operations
 */
import { client } from './request'
import type { ConceptSetDomainValues, IWebapiConceptSet } from '../types/ConceptSetTypes'

const D2E_WEBAPI_BASE_URL = 'd2e-webapi'

const getConceptSets = async (datasetId: string): Promise<IWebapiConceptSet[]> => {
  const response = await client({
    baseURL: D2E_WEBAPI_BASE_URL,
    url: `/conceptset`,
    method: 'GET',
    headers: { datasetid: datasetId },
  })
  return response.data
}

export const loadConceptSets = async (
  datasetId: string,
  options: { throwOnError?: boolean } = {}
): Promise<ConceptSetDomainValues> => {
  if (!datasetId) {
    console.warn('Missing datasetId for concept set API call')
    return {
      values: [],
      isLoading: false,
      loadedStatus: 'NO_RESULTS',
    }
  }

  try {
    const values = await getConceptSets(datasetId)

    const formattedValues = values.map(item => ({
      value: item.id,
      text: item.name,
      display_value: item.name,
      shared: item.shared || false,
      userName: item.userName || item.createdBy || '',
      createdDate: item.createdDate || '',
      modifiedDate: item.modifiedDate || '',
    }))

    const loadedStatus = values.length === 0 ? 'NO_RESULTS' : 'HAS_RESULTS'

    return {
      values: formattedValues,
      isLoading: false,
      loadedStatus,
    }
  } catch (error) {
    console.error('Error loading concept sets:', error)
    if (options.throwOnError) {
      throw error
    }
    return {
      values: [],
      isLoading: false,
      loadedStatus: 'NO_RESULTS',
    }
  }
}
