import { Test, TestingModule } from '@nestjs/testing'
import { DatasetPaConfigController } from './dataset-pa-config.controller'
import { DatasetPaConfigService } from './dataset-pa-config.service'
import { datasetPaConfigServiceMockFactory } from './dataset-pa-config.mock'

describe('DatasetPaConfigController', () => {
  let controller: DatasetPaConfigController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatasetPaConfigController],
      providers: [{ provide: DatasetPaConfigService, useFactory: datasetPaConfigServiceMockFactory }]
    }).compile()

    controller = module.get<DatasetPaConfigController>(DatasetPaConfigController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
