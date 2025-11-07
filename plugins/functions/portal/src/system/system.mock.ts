import { SystemService } from './system.service'
import { MockType } from 'test/type.mock'

export const systemServiceMockFactory: () => MockType<SystemService> = jest.fn(() => ({
  getSystemFeatures: jest.fn()
}))
