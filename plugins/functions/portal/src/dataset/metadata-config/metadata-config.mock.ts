import { MockType } from 'test/type.mock'
import { MetadataConfigService } from './metadata-config.service'

export const metadataConfigServiceMockFactory: () => MockType<MetadataConfigService> = jest.fn(() => ({
  getTagConfigNames: jest.fn()
}))
