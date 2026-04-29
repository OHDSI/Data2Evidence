import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DatasetPaConfigService } from './dataset-pa-config.service'
import { repositoryMockFactory } from '../../../test/repository.mock'
import { PatientAnalyticsConfigService } from '../../pa-config/pa-config.service'
import { paConfigServiceMockFactory } from '../../pa-config/pa-config.mock'
import { Dataset } from '../entity'

describe('DatasetPaConfigService', () => {
  let service: DatasetPaConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetPaConfigService,
        { provide: getRepositoryToken(Dataset), useFactory: repositoryMockFactory },
        { provide: PatientAnalyticsConfigService, useFactory: paConfigServiceMockFactory }
      ]
    }).compile()

    service = module.get<DatasetPaConfigService>(DatasetPaConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
