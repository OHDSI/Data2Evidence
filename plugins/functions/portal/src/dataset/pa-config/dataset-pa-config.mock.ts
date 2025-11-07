import { DatasetPaConfigService } from './dataset-pa-config.service'
import { MockType } from 'test/type.mock'

export const datasetPaConfigServiceMockFactory: () => MockType<DatasetPaConfigService> = jest.fn(() => ({
  getMyDatasetPaConfig: jest.fn()
}))
