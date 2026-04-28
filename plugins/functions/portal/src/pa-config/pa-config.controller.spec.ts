import { Test, TestingModule } from '@nestjs/testing'
import { PatientAnalyticsConfigController } from './pa-config.controller'
import { paConfigServiceMockFactory } from './pa-config.mock'
import { PatientAnalyticsConfigService } from './pa-config.service'

describe('PaConfigController', () => {
  let controller: PatientAnalyticsConfigController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientAnalyticsConfigController],
      providers: [{ provide: PatientAnalyticsConfigService, useFactory: paConfigServiceMockFactory }]
    }).compile()

    controller = module.get<PatientAnalyticsConfigController>(PatientAnalyticsConfigController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
