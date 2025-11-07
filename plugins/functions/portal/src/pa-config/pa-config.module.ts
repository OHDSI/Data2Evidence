import { Module } from '@danet/core'
import { PatientAnalyticsConfigController } from './pa-config.controller.ts'
import { PatientAnalyticsConfigService } from './pa-config.service.ts'
import { PaConfigApi } from './pa-config.api.ts'
import { RequestContextService } from '../common/request-context.service.ts'

@Module({
  controllers: [PatientAnalyticsConfigController],
  injectables: [PatientAnalyticsConfigService, PaConfigApi, RequestContextService],
  imports: [],
})
export class PaConfigModule {}
