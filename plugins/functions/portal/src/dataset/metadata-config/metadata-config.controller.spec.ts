import { Test, TestingModule } from '@nestjs/testing'
import { MetadataConfigController } from './metadata-config.controller'
import { MetadataConfigService } from './metadata-config.service'
import { metadataConfigServiceMockFactory } from './metadata-config.mock'

describe('MetadataConfigController', () => {
  let controller: MetadataConfigController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetadataConfigController],
      providers: [{ provide: MetadataConfigService, useFactory: metadataConfigServiceMockFactory }]
    }).compile()

    controller = module.get<MetadataConfigController>(MetadataConfigController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
