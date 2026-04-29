import { AnalyticsApi } from './analytics.api'

import { MockType } from 'test/type.mock'

export const analyticsApiMockFactory: () => MockType<AnalyticsApi> = jest.fn(() => ({
  getFilterScopes: jest.fn(),
  getDatabaseSchemaFilter: jest.fn()
}))
