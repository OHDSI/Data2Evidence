import { Test, TestingModule } from '@nestjs/testing'
import { UserArtifactService } from './user-artifact.service'
import { REQUEST } from '@nestjs/core'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UserArtifact } from './entity'
import { repositoryMockFactory } from '../../test/repository.mock'

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({ sub: 'mock-sub' })
}))

describe('UserArtifactService', () => {
  let service: UserArtifactService

  beforeEach(async () => {
    const req = {
      headers: {
        authorization: 'Bearer token'
      }
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserArtifactService,
        { provide: REQUEST, useValue: req },
        { provide: getRepositoryToken(UserArtifact), useFactory: repositoryMockFactory }
      ]
    }).compile()

    service = module.get<UserArtifactService>(UserArtifactService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
