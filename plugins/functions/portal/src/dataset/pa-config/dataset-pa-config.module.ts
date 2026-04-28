import { Module } from '@danet/core'
import { DatabaseModule } from '../../database/module.ts'
import { PaConfigModule } from '../../pa-config/pa-config.module.ts'
import { DatasetRepository } from '../repository/index.ts'
import { DatasetPaConfigController } from './dataset-pa-config.controller.ts'
import { DatasetPaConfigService } from './dataset-pa-config.service.ts'

const imports = [PaConfigModule, DatabaseModule]

const injectables = [DatasetPaConfigService, DatasetRepository]
@Module({
  imports,
  controllers: [DatasetPaConfigController],
  injectables
})
export class DatasetPaConfigModule { }
