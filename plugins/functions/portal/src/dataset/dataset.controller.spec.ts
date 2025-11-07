import { Test, TestingModule } from '@nestjs/testing'
import { DatasetController } from './dataset.controller'
import { DatasetFilterService } from './dataset-filter.service'
import { DatasetQueryService } from './query/dataset-query.service'
import { DatasetCommandService } from './command/dataset-command.service'
import {
  datasetCommandServiceMockFactory,
  datasetFilterServiceMockFactory,
  datasetQueryServiceMockFactory
} from './dataset.mock'

describe('DatasetController', () => {
  let controller: DatasetController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatasetController],
      providers: [
        { provide: DatasetQueryService, useFactory: datasetQueryServiceMockFactory },
        { provide: DatasetFilterService, useFactory: datasetFilterServiceMockFactory },
        { provide: DatasetCommandService, useFactory: datasetCommandServiceMockFactory }
      ]
    }).compile()

    controller = module.get<DatasetController>(DatasetController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
