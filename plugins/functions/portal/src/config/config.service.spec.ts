import { Test, TestingModule } from '@nestjs/testing'
import { REQUEST } from '@nestjs/core'
import { getRepositoryToken } from '@nestjs/typeorm'
import { repositoryMockFactory } from '../../test/repository.mock'
import { ConfigService } from './config.service'
import { Config } from './entity'

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({ sub: 'mock-sub' })
}))

describe('ConfigService', () => {
  let service: ConfigService

  beforeEach(async () => {
    const req = {
      headers: {
        authorization: 'Bearer token'
      }
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { provide: REQUEST, useValue: req },
        { provide: getRepositoryToken(Config), useFactory: repositoryMockFactory }
      ]
    }).compile()

    service = await module.resolve<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
