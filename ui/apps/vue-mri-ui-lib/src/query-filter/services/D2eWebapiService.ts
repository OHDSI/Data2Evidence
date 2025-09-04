import { client } from './request'
import type { IWebapiConceptSet } from '../types/ConceptSetTypes'

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
}

export const d2eWebapiService = new D2eWebapiService()
