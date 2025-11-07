import { Test, TestingModule } from '@nestjs/testing'
import { PublicDatasetController } from './public-dataset.controller'
import { PublicDatasetQueryService } from './public-dataset-query.service'
import { datasetQueryServiceMockFactory } from '../dataset.mock'

describe('PublicDatasetController', () => {
  let controller: PublicDatasetController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicDatasetController],
      providers: [{ provide: PublicDatasetQueryService, useFactory: datasetQueryServiceMockFactory }]
    }).compile()

    controller = module.get<PublicDatasetController>(PublicDatasetController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
