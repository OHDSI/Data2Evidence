import { MockType } from 'test/type.mock'
import { UserArtifactService } from './user-artifact.service'

export const UserArtifactServiceMockFactory: () => MockType<UserArtifactService> = jest.fn(() => ({
  getServiceArtifact: jest.fn()
}))
