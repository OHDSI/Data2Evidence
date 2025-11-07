import { MockType } from 'test/type.mock'
import { GroupService } from './group.service'

export const GroupServiceMockFactory: () => MockType<GroupService> = jest.fn(() => ({
  addUserToGroup: jest.fn()
}))
