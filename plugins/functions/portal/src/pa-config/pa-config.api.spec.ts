import { REQUEST } from '@nestjs/core'
import { HttpService } from '@nestjs/axios'
import { Test, TestingModule } from '@nestjs/testing'
import { httpServiceMockFactory } from '../../test/http-service.mock'
import { PaConfigApi } from './pa-config.api'
import { services } from '../env'

services.paConfig = 'pa-config-url'

describe('PaConfigApi', () => {
  let api: PaConfigApi

  beforeEach(async () => {
    const req = {
      headers: {
        authorization: 'Bearer token'
      }
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaConfigApi,
        { provide: REQUEST, useValue: req },
        { provide: HttpService, useFactory: httpServiceMockFactory }
      ]
    }).compile()

    api = await module.resolve<PaConfigApi>(PaConfigApi)
  })

  it('should be defined', () => {
    expect(api).toBeDefined()
  })
})
