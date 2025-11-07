import { Test, TestingModule } from '@nestjs/testing'
import { ConfigController } from './config.controller'
import { ConfigService } from './config.service'
import { ConfigMockFactory } from './config.mock'

describe('ConfigController', () => {
  let controller: ConfigController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [{ provide: ConfigService, useFactory: ConfigMockFactory }]
    }).compile()

    controller = module.get<ConfigController>(ConfigController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
