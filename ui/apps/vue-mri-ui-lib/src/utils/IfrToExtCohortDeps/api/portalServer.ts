import request from './request'

const PORTAL_SERVER_URL = 'system-portal'

export class PortalServer {
  public async getBackendConfig(datasetId: string) {
    return request({
      url: `${PORTAL_SERVER_URL}/dataset/pa-config/backend`,
      method: 'GET',
      params: { datasetId },
    })
  }
}

