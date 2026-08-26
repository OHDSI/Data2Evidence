import { UserMgmtApi } from './user-mgmt.api'

import { MockType } from 'test/type.mock'
import { UserMgmtService } from './user-mgmt.service'

export const userMgmtApiMockFactory: () => MockType<UserMgmtApi> = jest.fn(() => ({
  getUserGroups: jest.fn(),
  getDataSourceRoleMemberships: jest.fn(),
  getUnresolvedRequestStudyIds: jest.fn()
}))

export const userMgmtServiceMockFactory: () => MockType<UserMgmtService> = jest.fn(() => ({
  getResearcherDatasetIds: jest.fn(),
  getDataSourceRoleMemberships: jest.fn(),
  getUnresolvedRequestStudyIds: jest.fn()
}))
