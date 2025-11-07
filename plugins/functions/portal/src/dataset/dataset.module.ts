import { Module } from '@danet/core'
import { AnalyticsModule } from '../analytics/analytics.module.ts'
import { TransactionRunner } from '../common/data-source/transaction-runner.ts'
import { RequestContextService } from '../common/request-context.service.ts'
import { DatabaseModule } from '../database/module.ts'
import { TenantModule } from '../tenant/tenant.module.ts'
import { UserMgmtModule } from '../user-mgmt/user-mgmt.module.ts'
import { DatasetCommandService } from './command/dataset-command.service.ts'
import { DatasetFilterService } from './dataset-filter.service.ts'
import { DatasetController } from './dataset.controller.ts'
import { MetadataConfigModule } from './metadata-config/metadata-config.module.ts'
import { DatasetPaConfigModule } from './pa-config/dataset-pa-config.module.ts'
import { PublicDatasetModule } from './public/public-dataset.module.ts'
import { DatasetQueryService } from './query/dataset-query.service.ts'
import {
  DatasetAttributeConfigRepository,
  DatasetAttributeRepository,
  DatasetDashboardRepository,
  DatasetDetailRepository,
  DatasetReleaseRepository,
  DatasetRepository,
  DatasetTagRepository
} from './repository/index.ts'
import { IsDatasetAttributeValueValid } from './validator/dataset-attribute.validator.ts'
import { ResourceModule } from './resource/resource.module.ts'

const imports: Array<any> = [
  DatabaseModule,
  TenantModule,
  AnalyticsModule,
  UserMgmtModule,
  PublicDatasetModule,
  DatasetPaConfigModule,
  MetadataConfigModule,
  ResourceModule
]
const injectables = [
  DatasetQueryService,
  DatasetCommandService,
  DatasetFilterService,
  DatasetRepository,
  DatasetDetailRepository,
  DatasetDashboardRepository,
  DatasetAttributeRepository,
  DatasetAttributeConfigRepository,
  DatasetTagRepository,
  DatasetReleaseRepository,
  IsDatasetAttributeValueValid,
  TransactionRunner,
  RequestContextService
]
@Module({
  imports,
  controllers: [DatasetController],
  injectables
})
export class DatasetModule { }
