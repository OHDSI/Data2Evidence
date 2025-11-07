import { Test, TestingModule } from '@nestjs/testing'
import { DatasetFilterService } from './dataset-filter.service'
import { AnalyticsApi } from '../analytics/analytics.api'
import { analyticsApiMockFactory } from '../analytics/analytics.mock'
import { DatasetRepository } from './repository'
import { repositoryMockFactory } from '../../test/repository.mock'

describe('DatasetFilterService', () => {
  let service: DatasetFilterService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetFilterService,
        { provide: DatasetRepository, useFactory: repositoryMockFactory },
        { provide: AnalyticsApi, useFactory: analyticsApiMockFactory }
      ]
    }).compile()

    service = module.get<DatasetFilterService>(DatasetFilterService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
