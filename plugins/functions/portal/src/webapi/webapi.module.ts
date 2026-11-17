import { Module } from '@danet/core'
import { RequestContextService } from '../common/request-context.service.ts'
import { DatabaseModule } from '../database/module.ts'
import { WebApiSourceApi } from './webapi-source.api.ts'
import { WebApiSourceService } from './webapi-source.service.ts'
import { JobPluginsApi } from './jobplugins.api.ts'
import { WebApiDatasetLoader } from './webapi-dataset.loader.ts'
import { WebApiController } from './webapi.controller.ts'

@Module({
  imports: [DatabaseModule],
  controllers: [WebApiController],
  injectables: [WebApiSourceApi, JobPluginsApi, WebApiDatasetLoader, WebApiSourceService, RequestContextService],
})
export class WebApiModule {}
