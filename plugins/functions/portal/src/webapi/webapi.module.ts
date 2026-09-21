import { Module } from '@danet/core'
import { WebApiSourceApi } from './webapi-source.api.ts'
import { WebApiSourceService } from './webapi-source.service.ts'
import { JobPluginsApi } from './jobplugins.api.ts'

@Module({
  injectables: [WebApiSourceApi, JobPluginsApi, WebApiSourceService],
})
export class WebApiModule {}
