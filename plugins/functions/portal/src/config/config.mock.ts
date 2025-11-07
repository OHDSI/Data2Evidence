import { MockType } from 'test/type.mock'
import { ConfigService } from './config.service'

export const ConfigMockFactory: () => MockType<ConfigService> = jest.fn(() => ({
  getConfigByType: jest.fn()
}))
