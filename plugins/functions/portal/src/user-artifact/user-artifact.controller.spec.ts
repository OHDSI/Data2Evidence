import { Test, TestingModule } from '@nestjs/testing'
import { UserArtifactController } from './user-artifact.controller'
import { UserArtifactService } from './user-artifact.service'
import { UserArtifactServiceMockFactory } from './user-artifact.mock'

describe('UserArtifactController', () => {
  let controller: UserArtifactController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserArtifactController],
      providers: [{ provide: UserArtifactService, useFactory: UserArtifactServiceMockFactory }]
    }).compile()

    controller = module.get<UserArtifactController>(UserArtifactController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
