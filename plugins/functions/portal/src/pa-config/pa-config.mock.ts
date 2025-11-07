import { PaConfigApi } from './pa-config.api'
import { PatientAnalyticsConfigService } from './pa-config.service'
import { MockType } from 'test/type.mock'

export const paConfigServiceMockFactory: () => MockType<PatientAnalyticsConfigService> = jest.fn(() => ({
  getBackendConfig: jest.fn()
}))

export const paConfigApiMockFactory: () => MockType<PaConfigApi> = jest.fn(() => ({
  getAllConfigs: jest.fn()
}))
