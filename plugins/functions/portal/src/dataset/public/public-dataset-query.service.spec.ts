import { Test, TestingModule } from '@nestjs/testing'
import { v4 as uuidv4 } from 'uuid'
import { PublicDatasetQueryService } from './public-dataset-query.service'
import { repositoryMockFactory } from '../../../test/repository.mock'
import { MockType } from '../../../test/type.mock'
import { TenantService } from '../../tenant/tenant.service'
import { tenantServiceMockFactory } from '../../tenant/tenant.mock'
import { DatasetRepository } from '../repository'

describe('PublicDatasetQueryService', () => {
  let service: PublicDatasetQueryService
  let mockRepository: MockType<DatasetRepository>
  let mockTenantService: MockType<TenantService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicDatasetQueryService,
        { provide: DatasetRepository, useFactory: repositoryMockFactory },
        { provide: TenantService, useFactory: tenantServiceMockFactory }
      ]
    }).compile()

    service = module.get<PublicDatasetQueryService>(PublicDatasetQueryService)
    mockRepository = module.get(DatasetRepository)
    mockTenantService = module.get(TenantService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should get public datasets', async () => {
    // Given
    const mockDatasetDetail = { id: 'detail-id', name: 'detail-name', description: 'detail-description' }
    const mockDatasetTags = [{ id: 'tag-id', name: 'tag-name' }]
    const mockDatasetAttributes = [{ dataType: 'STRING', name: 'attribute-name', value: 'attribute-value' }]
    const mockDataModel = 'mock-data-model [mock-flow]'
    const mockDataset = {
      id: 'dataset-id',
      datasetDetail: mockDatasetDetail,
      attributes: mockDatasetAttributes,
      tags: mockDatasetTags,
      dataModel: mockDataModel
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
      getMany: jest.fn().mockImplementationOnce(() => {
        return [mockDataset]
      })
    }

    jest.spyOn(mockRepository, 'createQueryBuilder').mockImplementation(() => mockCreateQueryBuilder)
    jest.spyOn(mockTenantService, 'getTenant').mockImplementation(() => mockTenant)

    // When
    const datasets = await service.getDatasets({})

    // Then
    expect(datasets.length).toEqual(1)
    expect(datasets[0]).toEqual({
      id: mockDataset.id,
      studyDetail: mockDatasetDetail,
      tenant: mockTenant,
      attributes: [{ dataType: 'STRING', name: 'attribute-name', value: 'attribute-value' }],
      tags: [{ id: 'tag-id', name: 'tag-name' }],
      dataModel: 'mock-data-model'
    })
    expect(mockTenantService.getTenant).toBeCalledTimes(1)
    expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('dataset')
    expect(mockCreateQueryBuilder.leftJoin).toHaveBeenCalledWith('dataset.datasetDetail', 'datasetDetail')
    expect(mockCreateQueryBuilder.leftJoin).toHaveBeenCalledWith('dataset.tags', 'tag')
    expect(mockCreateQueryBuilder.leftJoin).toHaveBeenCalledWith('dataset.attributes', 'attribute')
    expect(mockCreateQueryBuilder.leftJoin).toHaveBeenCalledWith('attribute.attributeConfig', 'attributeConfig')
    expect(mockCreateQueryBuilder.where).toHaveBeenCalledWith('dataset.visibilityStatus = :visibilityStatus', {
      visibilityStatus: 'PUBLIC'
    })
    expect(mockCreateQueryBuilder.getMany).toBeCalledTimes(1)
  })
})
