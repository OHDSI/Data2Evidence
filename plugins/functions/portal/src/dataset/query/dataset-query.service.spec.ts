import { REQUEST } from '@nestjs/core'
import { Test, TestingModule } from '@nestjs/testing'
import { v4 as uuidv4 } from 'uuid'
import { DatasetQueryService } from './dataset-query.service'
import { datasetAttributeRepositoryMockFactory, repositoryMockFactory } from '../../../test/repository.mock'
import { MockType } from '../../../test/type.mock'
import { TenantService } from '../../tenant/tenant.service'
import { tenantServiceMockFactory } from '../../tenant/tenant.mock'
import {
  DatasetAttributeRepository,
  DatasetDashboardRepository,
  DatasetReleaseRepository,
  DatasetRepository
} from '../repository'
import { datasetFilterServiceMockFactory } from '../dataset.mock'
import { DatasetFilterService } from '../dataset-filter.service'
import { UserMgmtService } from '../../user-mgmt/user-mgmt.service'
import { userMgmtServiceMockFactory } from '../../user-mgmt/user-mgmt.mock'

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({ sub: 'mock-sub' })
}))

describe('DatasetQueryService', () => {
  let service: DatasetQueryService
  let mockRepository: MockType<DatasetRepository>
  let mockTenantService: MockType<TenantService>
  let mockAttributeRepository: MockType<DatasetAttributeRepository>

  beforeEach(async () => {
    const req = {
      headers: {
        authorization: 'Bearer token'
      }
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetQueryService,
        { provide: REQUEST, useValue: req },
        { provide: DatasetRepository, useFactory: repositoryMockFactory },
        { provide: DatasetAttributeRepository, useFactory: datasetAttributeRepositoryMockFactory },
        { provide: TenantService, useFactory: tenantServiceMockFactory },
        { provide: DatasetFilterService, useFactory: datasetFilterServiceMockFactory },
        { provide: DatasetReleaseRepository, useFactory: repositoryMockFactory },
        { provide: DatasetDashboardRepository, useFactory: repositoryMockFactory },
        { provide: UserMgmtService, useFactory: userMgmtServiceMockFactory }
      ]
    }).compile()

    service = await module.resolve<DatasetQueryService>(DatasetQueryService)
    mockRepository = module.get(DatasetRepository)
    mockTenantService = module.get(TenantService)
    mockAttributeRepository = module.get(DatasetAttributeRepository)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should find dataset with detail', async () => {
    // Given
    const mockDatasetDetail = { id: 'detail-id', name: 'detail-name', description: 'detail-description' }
    const mockDatasetTags = [{ id: 'tag-id', name: 'tag-name' }]
    const mockDatasetAttributes = [{ dataType: 'STRING', name: 'attribute-name', value: 'attribute-value' }]
    const mockDataset = {
      id: 'dataset-id',
      datasetDetail: mockDatasetDetail,
      attributes: mockDatasetAttributes,
      tags: mockDatasetTags
    }
    const mockTenantId = uuidv4()
    const mockTenant = {
      id: mockTenantId,
      name: 'Mock Tenant'
    }
    const mockCreateQueryBuilder: any = {
      leftJoin: jest.fn().mockImplementation(() => {
        return mockCreateQueryBuilder
      }),
      where: jest.fn().mockImplementation(() => {
        return mockCreateQueryBuilder
      }),
      select: jest.fn().mockImplementation(() => {
        return mockCreateQueryBuilder
      }),
      getOne: jest.fn().mockImplementationOnce(() => {
        return mockDataset
      })
    }

    jest.spyOn(mockRepository, 'createQueryBuilder').mockImplementation(() => mockCreateQueryBuilder)
    jest.spyOn(mockTenantService, 'getTenant').mockImplementation(() => mockTenant)
    jest.spyOn(mockAttributeRepository, 'getAttributeDto').mockImplementation(() => mockDatasetAttributes)

    // When
    const dataset = await service.getDataset(mockDataset.id)

    // Then
    expect(dataset).toEqual({
      id: mockDataset.id,
      studyDetail: mockDatasetDetail,
      tenant: mockTenant,
      attributes: [{ dataType: 'STRING', name: 'attribute-name', value: 'attribute-value' }],
      tags: [{ id: 'tag-id', name: 'tag-name' }]
    })
    expect(mockTenantService.getTenant).toBeCalledTimes(1)
    expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('dataset')
    expect(mockCreateQueryBuilder.leftJoin).toHaveBeenCalledWith('dataset.datasetDetail', 'datasetDetail')
    expect(mockCreateQueryBuilder.leftJoin).toHaveBeenCalledWith('dataset.dashboards', 'dashboard')
    expect(mockCreateQueryBuilder.leftJoin).toHaveBeenCalledWith('dataset.tags', 'tag')
    expect(mockCreateQueryBuilder.leftJoin).toHaveBeenCalledWith('dataset.attributes', 'attribute')
    expect(mockCreateQueryBuilder.leftJoin).toHaveBeenCalledWith('attribute.attributeConfig', 'attributeConfig')
    expect(mockCreateQueryBuilder.where).toHaveBeenCalledWith('dataset.id = :id', { id: mockDataset.id })
    expect(mockCreateQueryBuilder.getOne).toBeCalledTimes(1)
  })
})
