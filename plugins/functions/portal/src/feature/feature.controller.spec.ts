import { Test, TestingModule } from '@nestjs/testing'
import { FeatureController } from './feature.controller'
import { FeatureService } from './feature.service'
import { featureServiceMockFactory } from './feature.mock'

describe('FeatureController', () => {
  let controller: FeatureController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureController],
      providers: [{ provide: FeatureService, useFactory: featureServiceMockFactory }]
    }).compile()

    controller = module.get<FeatureController>(FeatureController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
