import { FeatureService } from './feature.service'
import { MockType } from 'test/type.mock'

export const featureServiceMockFactory: () => MockType<FeatureService> = jest.fn(() => ({
  getFeatures: jest.fn(),
  setFeature: jest.fn()
}))
