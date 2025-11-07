import { Module } from '@danet/core'
import { AnalyticsApi } from './analytics.api.ts'

@Module({
  controllers: [],
  injectables: [AnalyticsApi]
})
export class AnalyticsModule { }
