import { Module } from '@danet/core'
import { DatabaseModule } from '../../database/module.ts'
import { TransactionRunner } from './transaction-runner.ts'

@Module({
  imports: [DatabaseModule],
  injectables: [TransactionRunner],
  exports: [TransactionRunner]
})
export class TransactionModule { }