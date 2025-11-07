import { Test, TestingModule } from '@nestjs/testing'
import { REQUEST } from '@nestjs/core'
import { FeatureService } from './feature.service'
import { FeatureRepository } from './repository/feature.repository'
import { repositoryMockFactory } from '../../test/repository.mock'
import { TransactionRunner } from '../common/data-source/transaction-runner'
import { transactionRunnerMockFactory } from '../common/data-source/transaction-runner.mock'

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({ sub: 'mock-sub' })
}))

describe('FeatureService', () => {
  let service: FeatureService

  beforeEach(async () => {
    const req = {
      headers: {
        authorization: 'Bearer token'
      }
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: REQUEST, useValue: req },
        { provide: FeatureRepository, useFactory: repositoryMockFactory },
        { provide: TransactionRunner, useFactory: transactionRunnerMockFactory }
      ]
    }).compile()

    service = await module.resolve<FeatureService>(FeatureService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
