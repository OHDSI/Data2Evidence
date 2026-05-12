import { DatasetQueryService } from './query/dataset-query.service'
import { DatasetFilterService } from './dataset-filter.service'
import { DatasetCommandService } from './command/dataset-command.service'
import { MockType } from 'test/type.mock'

export const datasetQueryServiceMockFactory: () => MockType<DatasetQueryService> = jest.fn(() => ({
  getDataset: jest.fn()
}))

export const datasetFilterServiceMockFactory: () => MockType<DatasetFilterService> = jest.fn(() => ({
  getDatabaseSchemaFilterResults: jest.fn()
}))

export const datasetCommandServiceMockFactory: () => MockType<DatasetCommandService> = jest.fn(() => ({
  createDatasetSnapshot: jest.fn()
}))
