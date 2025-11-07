import { Test, TestingModule } from '@nestjs/testing'
import { REQUEST } from '@nestjs/core'
import { MetadataConfigService } from './metadata-config.service'
import { datasetAttributeRepositoryMockFactory, repositoryMockFactory } from '../../../test/repository.mock'
import { DatasetTagConfigRepository, DatasetAttributeConfigRepository } from '../repository'

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({ sub: 'mock-sub' })
}))

describe('MetadataConfigService', () => {
  let service: MetadataConfigService

  const req = {
    headers: {
      authorization: 'Bearer token'
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetadataConfigService,
        { provide: REQUEST, useValue: req },
        { provide: DatasetAttributeConfigRepository, useFactory: datasetAttributeRepositoryMockFactory },
        { provide: DatasetTagConfigRepository, useFactory: repositoryMockFactory }
      ]
    }).compile()

    service = await module.resolve<MetadataConfigService>(MetadataConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
