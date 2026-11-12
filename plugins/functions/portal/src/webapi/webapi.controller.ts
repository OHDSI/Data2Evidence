import { Controller, Middleware, Post } from '@danet/core'
import { RequestContextMiddleware } from '../common/request-context.middleware.ts'
import { RequestContextService } from '../common/request-context.service.ts'
import { WebApiSourceService } from './webapi-source.service.ts'

// Admin only: the gateway maps this route to portal.dataset.update, which only
// ALP_SYSTEM_ADMIN holds (plugins/functions/package.json).
@Middleware(RequestContextMiddleware)
@Controller('system-portal/webapi')
export class WebApiController {
  constructor(
    private readonly webApiSourceService: WebApiSourceService,
    private readonly requestContextService: RequestContextService,
  ) {}

  @Post('resync-sources')
  async resyncSources() {
    return await this.webApiSourceService.resyncAllSources(this.requestContextService.getOriginalToken())
  }
}
