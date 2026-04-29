import { Module } from '@danet/core'
import { WebApiSourceApi } from './webapi-source.api.ts'
import { WebApiSourceService } from './webapi-source.service.ts'

@Module({
  injectables: [WebApiSourceApi, WebApiSourceService],
})
export class WebApiModule {}
