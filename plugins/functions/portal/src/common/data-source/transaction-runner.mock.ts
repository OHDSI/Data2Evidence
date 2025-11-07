import { TransactionRunner } from './transaction-runner'
import { MockType } from 'test/type.mock'

export const transactionRunnerMockFactory: () => MockType<TransactionRunner> = jest.fn(() => ({
  run: jest.fn()
}))
