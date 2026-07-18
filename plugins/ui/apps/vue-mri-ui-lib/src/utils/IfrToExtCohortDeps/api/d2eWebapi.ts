import request from './request'

const D2E_WEBAPI_URL = '/d2e-webapi'

export class D2eWebapi {
  public async getIncludedConcepts(conceptSetIds: string[], datasetId: string) {
    return request({
      url: `${D2E_WEBAPI_URL}/conceptset/included-concepts`,
      method: 'POST',
      data: { conceptSetIds, datasetId },
      headers: { datasetid: datasetId },
    })
  }
}
