import { Test, TestingModule } from '@nestjs/testing'
import { REQUEST } from '@nestjs/core'
import { DatasetCommandService } from './dataset-command.service'
import { SharedPortalApi } from '../../shared-portal/shared-portal.api'
import { sharedPortalApiMockFactory } from '../../shared-portal/shared-portal.mock'
import {
  DatasetDashboardRepository,
  DatasetDetailRepository,
  DatasetAttributeRepository,
  DatasetRepository,
  DatasetTagRepository,
  DatasetReleaseRepository
} from '../repository'
import { repositoryMockFactory } from '../../../test/repository.mock'
import { TenantService } from '../../tenant/tenant.service'
import { tenantServiceMockFactory } from '../../tenant/tenant.mock'
import { TransactionRunner } from '../../common/data-source/transaction-runner'
import { transactionRunnerMockFactory } from '../../common/data-source/transaction-runner.mock'

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({ sub: 'mock-sub' })
}))

describe('DatasetCommandService', () => {
  let service: DatasetCommandService

  beforeEach(async () => {
    const req = {
      headers: {
        authorization: 'Bearer token'
      }
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetCommandService,
        { provide: REQUEST, useValue: req },
        { provide: SharedPortalApi, useFactory: sharedPortalApiMockFactory },
        { provide: TransactionRunner, useFactory: transactionRunnerMockFactory },
        { provide: TenantService, useFactory: tenantServiceMockFactory },
        { provide: DatasetRepository, useFactory: repositoryMockFactory },
        { provide: DatasetDashboardRepository, useFactory: repositoryMockFactory },
        { provide: DatasetDetailRepository, useFactory: repositoryMockFactory },
        { provide: DatasetAttributeRepository, useFactory: repositoryMockFactory },
        { provide: DatasetTagRepository, useFactory: repositoryMockFactory },
        { provide: DatasetReleaseRepository, useFactory: repositoryMockFactory }
      ]
    }).compile()

    service = await module.resolve<DatasetCommandService>(DatasetCommandService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
