import { MockType } from 'test/type.mock'
import { ResourceService } from './resource.service'

export const resourceServiceMockFactory: () => MockType<ResourceService> = jest.fn(() => ({
  getResources: jest.fn()
}))
