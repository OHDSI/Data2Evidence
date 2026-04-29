import request from './request'

const PA_CONFIG_SVC_URL = 'pa-config-svc'

export class PaConfigSvc {
  public async getBackendConfig(datasetId: string, configId: string) {
    return request({
      url: `${PA_CONFIG_SVC_URL}/enduser`,
      method: 'POST',
      params: { datasetId },
      data: { action: 'getBackendConfig', configId },
    })
  }
}

