import { Module } from '@danet/core'
import { DatabaseModule } from '../../database/module.ts'
import { TenantModule } from '../../tenant/tenant.module.ts'
import { DatasetRepository } from '../repository/index.ts'
import { PublicDatasetQueryService } from './public-dataset-query.service.ts'
import { PublicDatasetController } from './public-dataset.controller.ts'

const imports = [TenantModule, DatabaseModule]

const injectables = [PublicDatasetQueryService, DatasetRepository]
@Module({
  imports,
  controllers: [PublicDatasetController],
  injectables
})
export class PublicDatasetModule { }
