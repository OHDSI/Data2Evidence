import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DataSource, EntityManager, QueryRunner } from 'npm:typeorm'
import { MockType } from '../../../test/type.mock'
import { dataSourceMockFactory } from '../../../test/typeorm.mock'
import { DEFAULT_ERROR_MESSAGE } from '../const'
import { TransactionRunner } from './transaction-runner'

describe('TransactionRunner', () => {
  let service: TransactionRunner
  let mockDataSource: MockType<DataSource>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionRunner, { provide: DataSource, useFactory: dataSourceMockFactory }]
    }).compile()

    service = await module.resolve<TransactionRunner>(TransactionRunner)
    mockDataSource = module.get(DataSource)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should throw InternalServerErrorException when datasource fails to initialize', async () => {
    // Given
    Object.defineProperty(mockDataSource, 'isInitialized', { value: false, writable: false })

    jest.spyOn(mockDataSource, 'initialize').mockImplementation(() => {
      throw new Error('Datasource fails to initialize')
    })

    // When
    const action = async () => {
      await service.run(() => {
        throw new Error('This should fail the test if it unexpectedly runs')
      }, undefined)
    }

    // Then
    expect(action).rejects.toThrow(new InternalServerErrorException('Datasource initialisation has failed'))
  })

  it('should run transaction query', async () => {
    // Given
    Object.defineProperty(mockDataSource, 'isInitialized', { value: false, writable: false })
    const mockEntityManager = {
      save: jest.fn()
    } as MockType<EntityManager>
    const mockQueryRunner = {
      manager: mockEntityManager,
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn()
    } as MockType<QueryRunner>
    jest.spyOn(mockDataSource, 'createQueryRunner').mockReturnValueOnce(mockQueryRunner)
    const mockFn = jest.fn(() => 'result')
    const mockDto = {} as MockType<object>

    // When
    const action = await service.run(mockFn, mockDto)

    // Then
    expect(action).toBe('result')
    expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1)
    expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith(mockEntityManager, mockDto)
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1)
    expect(mockQueryRunner.release).toHaveBeenCalledTimes(1)
    expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled()
  })

  it('should rollback & throw http error if transaction query throws http client error', async () => {
    // Given
    Object.defineProperty(mockDataSource, 'isInitialized', { value: false, writable: false })
    const mockEntityManager = {
      save: jest.fn()
    } as MockType<EntityManager>

    const mockQueryRunner = {
      manager: mockEntityManager,
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn()
    } as MockType<QueryRunner>

    jest.spyOn(mockDataSource, 'createQueryRunner').mockReturnValueOnce(mockQueryRunner)
    const mockHttpError = new BadRequestException('Bad request')
    const mockFn = jest.fn(() => {
      return Promise.reject(mockHttpError)
    })
    const mockDto = {} as MockType<object>

    try {
      // When
      await service.run(mockFn, mockDto)
    } catch (e) {
      // Then
      expect(e).toEqual(mockHttpError)
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1)
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith(mockEntityManager, mockDto)
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1)
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1)
    }
  })

  it('should rollback & throw http error if transaction query throws http server error', async () => {
    // Given
    Object.defineProperty(mockDataSource, 'isInitialized', { value: false, writable: false })
    const mockEntityManager = {
      save: jest.fn()
    } as MockType<EntityManager>

    const mockQueryRunner = {
      manager: mockEntityManager,
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn()
    } as MockType<QueryRunner>

    jest.spyOn(mockDataSource, 'createQueryRunner').mockReturnValueOnce(mockQueryRunner)
    const mockHttpError = new InternalServerErrorException('Server failure')
    const mockFn = jest.fn(() => {
      return Promise.reject(mockHttpError)
    })
    const mockDto = {} as MockType<object>

    try {
      // When
      await service.run(mockFn, mockDto)
    } catch (e) {
      // Then
      expect(e).toEqual(mockHttpError)
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1)
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith(mockEntityManager, mockDto)
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1)
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1)
    }
  })

  it('should rollback & throw default message error if transaction query throws non-http error', async () => {
    // Given
    Object.defineProperty(mockDataSource, 'isInitialized', { value: false, writable: false })
    const mockEntityManager = {
      save: jest.fn()
    } as MockType<EntityManager>

    const mockQueryRunner = {
      manager: mockEntityManager,
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn()
    } as MockType<QueryRunner>

    jest.spyOn(mockDataSource, 'createQueryRunner').mockReturnValueOnce(mockQueryRunner)
    const mockFn = jest.fn(() => {
      return Promise.reject(new Error('Function error'))
    })
    const mockDto = {} as MockType<object>

    try {
      // When
      await service.run(mockFn, mockDto)
    } catch (e) {
      // Then
      expect(e).toEqual(new InternalServerErrorException(DEFAULT_ERROR_MESSAGE))
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1)
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith(mockEntityManager, mockDto)
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1)
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1)
    }
  })
})
