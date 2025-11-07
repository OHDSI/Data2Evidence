import { Test, TestingModule } from '@nestjs/testing'
import { GroupService } from './group.service'
import { REQUEST } from '@nestjs/core'
import { getRepositoryToken } from '@nestjs/typeorm'
import { repositoryMockFactory } from '../../../test/repository.mock'
import { UserArtifactGroup } from '../entity'

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({ sub: 'mock-sub' })
}))

describe('GroupService', () => {
  let service: GroupService

  beforeEach(async () => {
    const req = {
      headers: {
        authorization: 'Bearer token'
      }
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        { provide: REQUEST, useValue: req },
        { provide: getRepositoryToken(UserArtifactGroup), useFactory: repositoryMockFactory }
      ]
    }).compile()

    service = module.get<GroupService>(GroupService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
