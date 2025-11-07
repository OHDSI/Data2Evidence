import { Injectable, SCOPE } from '@danet/core'
import { PA_CONFIG_TYPE } from '../common/const.ts'
import { PaConfigApi } from './pa-config.api.ts'

@Injectable({ scope: SCOPE.REQUEST })
export class PatientAnalyticsConfigService {
  constructor(private readonly paConfigApi: PaConfigApi) {}

  async getList() {
    const configs = await this.paConfigApi.getAllConfigs();
    const availablePaConfigs = configs
      .filter((c) => c.configs.length > 0)
      .flatMap((c) => c.configs);
    return availablePaConfigs.map((c) => {
      const { configId, configName } = c.meta;
      return {
        configId,
        configName,
      };
    });
  }

  getBackendConfig(id: string, datasetId: string) {
    return this.paConfigApi.getPaConfig(id, PA_CONFIG_TYPE.BACKEND, datasetId);
  }

  getMyConfig(id: string, datasetId: string) {
    return this.paConfigApi.getPaConfig(id, PA_CONFIG_TYPE.USER, datasetId);
  }
}
