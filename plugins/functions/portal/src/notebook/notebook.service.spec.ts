import { Test, TestingModule } from '@nestjs/testing'
import { REQUEST } from '@nestjs/core'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotebookService } from './notebook.service'
import { repositoryMockFactory } from '../../test/repository.mock'
import { UserArtifactService } from '../user-artifact/user-artifact.service'
import { UserArtifact } from '../user-artifact/entity'

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({ sub: 'mock-sub' })
}))

describe('NotebookService', () => {
  let service: NotebookService

  beforeEach(async () => {
    const req = {
      headers: {
        authorization: 'Bearer token'
      }
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotebookService,
        UserArtifactService,
        { provide: REQUEST, useValue: req },
        { provide: getRepositoryToken(UserArtifact), useFactory: repositoryMockFactory }
      ]
    }).compile()

    service = await module.resolve<NotebookService>(NotebookService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
