import request from './request'

const TERMINOLOGY_URL = 'terminology'

export class Terminology {
  public async getConceptByName(conceptName: string, datasetId: string) {
    return request({
      url: `${TERMINOLOGY_URL}/concept/searchByName`,
      method: 'POST',
      data: { conceptName, datasetId },
    })
  }

  public async getConceptById(conceptId: number, datasetId: string) {
    return request({
      url: `${TERMINOLOGY_URL}/concept/searchById`,
      method: 'POST',
      data: { conceptId, datasetId },
    })
  }

  public async getConceptByCode(conceptCode: string, datasetId: string) {
    return request({
      url: `${TERMINOLOGY_URL}/concept/searchByCode`,
      method: 'POST',
      data: { conceptCode, datasetId },
    })
  }

  public async getConceptsFromConceptSet(conceptSetId: string, datasetId: string) {
    return request({
      url: `${TERMINOLOGY_URL}/concept-set/${conceptSetId}?datasetId=${datasetId}`,
      method: 'GET',
    })
  }
}

