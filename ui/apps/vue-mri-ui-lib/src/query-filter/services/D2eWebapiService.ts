import { client } from './request'
import type {
  IWebapiConceptSet,
  ConceptSetExpression,
  CreateConceptSetRequest,
  ConceptDetail,
} from '../types/ConceptSetTypes'

const D2E_WEBAPI_BASE_URL = 'd2e-webapi'

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

  public async createConceptSet(conceptSetData: CreateConceptSetRequest, datasetId: string): Promise<number> {
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

    const conceptSetId = response.data

    // Step 2: Add concepts to the concept set if expression has items
    // Note that even though Step 1 may include the expression items, it is not saved, and this step is needed
    if (conceptSetData.expression?.items?.length > 0) {
      const conceptItems = conceptSetData.expression.items.map(item => ({
        conceptId: item.concept.CONCEPT_ID,
        isExcluded: item.isExcluded,
        includeDescendants: item.includeDescendants,
        includeMapped: item.includeMapped,
      }))

      await this.updateConceptSetItems(conceptSetId, conceptItems, datasetId)
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
    datasetId: string
  ): Promise<number | { statusCode: number }> {
    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/conceptset/${conceptSetId}/items`,
      method: 'PUT',
      headers: { datasetid: datasetId },
      data: conceptItems,
    })
    return response.data
  }

  public async getConceptById(conceptId: number, datasetId: string): Promise<ConceptDetail[]> {
    const data = {
      QUERY: conceptId.toString(),
    }

    const response = await client({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/vocabulary/${datasetId}/search`,
      method: 'POST',
      headers: { datasetid: datasetId },
      data,
    })
    return response.data
  }
}

export const d2eWebapiService = new D2eWebapiService()
