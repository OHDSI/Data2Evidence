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
  DatasetReleaseRepository,
  DatasetCodeRepository,
  DatasetCodeQueryRepository
} from '../repository'
import { repositoryMockFactory } from '../../../test/repository.mock'
import { TenantService } from '../../tenant/tenant.service'
import { tenantServiceMockFactory } from '../../tenant/tenant.mock'
import { TransactionRunner } from '../../common/data-source/transaction-runner'
import { transactionRunnerMockFactory } from '../../common/data-source/transaction-runner.mock'
import { RequestContextService } from '../../common/request-context.service'
import { WebApiSourceService } from '../../webapi/webapi-source.service'
import { TrexApiService } from '../trex-api.service'

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

async function buildServiceWithMocks(overrides: {
  getDataset?: jest.Mock
  find?: jest.Mock
  updateRowShape?: jest.Mock
  transactionRun?: jest.Mock
} = {}) {
  const req = { headers: { authorization: 'Bearer token' } }

  const getDataset = overrides.getDataset ?? jest.fn().mockResolvedValue(null)
  const findDatasets = overrides.find ?? jest.fn().mockResolvedValue([])
  const updateRowShape = overrides.updateRowShape ?? jest.fn().mockResolvedValue(undefined)

  const stubEntityMgr = {
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    find: jest.fn().mockResolvedValue([])
  }
  const transactionRun =
    overrides.transactionRun ??
    jest.fn().mockImplementation((fn: Function) => fn(stubEntityMgr))

  const datasetRepoMock = {
    getDataset,
    find: findDatasets,
    updateRowShape,
    create: jest.fn(),
    insertDataset: jest.fn(),
    updateDataset: jest.fn(),
    deleteDataset: jest.fn(),
    createQueryBuilder: jest.fn()
  }

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DatasetCommandService,
      { provide: REQUEST, useValue: req },
      {
        provide: TransactionRunner,
        useValue: { run: transactionRun }
      },
      {
        provide: TenantService,
        useValue: { getTenant: jest.fn().mockReturnValue({ id: 'tenant-1' }) }
      },
      { provide: DatasetRepository, useValue: datasetRepoMock },
      {
        provide: DatasetDetailRepository,
        useValue: {
          getDetail: jest.fn(),
          create: jest.fn(),
          insertDetail: jest.fn(),
          find: jest.fn().mockResolvedValue([])
        }
      },
      {
        provide: DatasetDashboardRepository,
        useValue: { find: jest.fn().mockResolvedValue([]) }
      },
      {
        provide: DatasetAttributeRepository,
        useValue: {
          getAttributeDto: jest.fn().mockResolvedValue([]),
          createAttribute: jest.fn(),
          insertAttribute: jest.fn()
        }
      },
      {
        provide: DatasetTagRepository,
        useValue: {
          getTags: jest.fn().mockResolvedValue([]),
          insertTag: jest.fn(),
          deleteTag: jest.fn()
        }
      },
      {
        provide: DatasetReleaseRepository,
        useValue: { getReleaseByDatasetIdAndName: jest.fn().mockResolvedValue([]) }
      },
      {
        provide: DatasetCodeRepository,
        useValue: { getDatasetCode: jest.fn(), create: jest.fn(), upsert: jest.fn() }
      },
      {
        provide: DatasetCodeQueryRepository,
        useValue: {
          upsertDatasetCodeQuery: jest.fn(),
          deleteDatasetCodeQuery: jest.fn()
        }
      },
      {
        provide: RequestContextService,
        useValue: {
          getAuthToken: jest.fn().mockReturnValue({ sub: 'user-1' }),
          getOriginalToken: jest.fn().mockReturnValue('Bearer token')
        }
      },
      {
        provide: WebApiSourceService,
        useValue: {
          syncSourceForDataset: jest.fn().mockResolvedValue(undefined),
          deleteSourceForDataset: jest.fn().mockResolvedValue(undefined)
        }
      },
      {
        provide: TrexApiService,
        useValue: { attach: jest.fn().mockResolvedValue(undefined) }
      }
    ]
  }).compile()

  const svc = await module.resolve<DatasetCommandService>(DatasetCommandService)
  return { svc, datasetRepoMock, transactionRun, stubEntityMgr }
}

describe('DatasetCommandService.transformToWebApi', () => {
  it('rejects an id that does not exist in the database', async () => {
    const { svc } = await buildServiceWithMocks({
      getDataset: jest.fn().mockResolvedValue(null)
    })

    await expect((svc as any).transformToWebApi('unknown-id')).rejects.toThrow(/not found/i)
  })

  it('rejects a snapshot row (has sourceDatasetId set)', async () => {
    const snapshotRow = { id: 'snap-1', sourceDatasetId: 'source-1', visibilityStatus: 'DEFAULT' }
    const { svc } = await buildServiceWithMocks({
      getDataset: jest.fn().mockResolvedValue(snapshotRow)
    })

    await expect((svc as any).transformToWebApi('snap-1')).rejects.toThrow(/is a snapshot/i)
  })

  it('returns { transformed: false } when no snapshot points at the source', async () => {
    const sourceRow = { id: 'src-1', sourceDatasetId: null, visibilityStatus: 'HIDDEN' }
    const { svc } = await buildServiceWithMocks({
      getDataset: jest.fn().mockResolvedValue(sourceRow),
      find: jest.fn().mockResolvedValue([]) // no snapshots
    })

    const result = await (svc as any).transformToWebApi('src-1')

    expect(result).toMatchObject({ id: 'src-1', transformed: false, reason: expect.stringMatching(/already webapi-managed/i) })
  })

  it('rejects when more than one snapshot points at the source', async () => {
    const sourceRow = { id: 'src-2', sourceDatasetId: null, visibilityStatus: 'HIDDEN' }
    const snapshots = [
      { id: 'snap-a', sourceDatasetId: 'src-2' },
      { id: 'snap-b', sourceDatasetId: 'src-2' }
    ]
    const { svc } = await buildServiceWithMocks({
      getDataset: jest.fn().mockResolvedValue(sourceRow),
      find: jest.fn().mockResolvedValue(snapshots)
    })

    await expect((svc as any).transformToWebApi('src-2')).rejects.toThrow(/multiple snapshots|\d+ snapshot/i)
  })

  it('happy path: calls updateRowShape with type="webapi" and deletes the snapshot, returns { transformed: true }', async () => {
    const sourceRow = { id: 'src-3', sourceDatasetId: null, visibilityStatus: 'HIDDEN' }
    const snapshot = { id: 'snap-only', sourceDatasetId: 'src-3' }
    const updateRowShape = jest.fn().mockResolvedValue(undefined)
    const { svc, datasetRepoMock, stubEntityMgr } = await buildServiceWithMocks({
      getDataset: jest.fn().mockResolvedValue(sourceRow),
      find: jest.fn().mockResolvedValue([snapshot]),
      updateRowShape
    })

    const result = await (svc as any).transformToWebApi('src-3')

    expect(result).toMatchObject({ id: 'src-3', transformed: true })
    expect(datasetRepoMock.updateRowShape).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ visibilityStatus: expect.any(String), type: "webapi" }),
    )
    expect(stubEntityMgr.delete.mock.calls.length).toBeGreaterThan(0)
  })
})
