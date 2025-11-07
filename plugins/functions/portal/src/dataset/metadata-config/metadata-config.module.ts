import { Module } from '@danet/core'
import { DatabaseModule } from '../../database/module.ts'
import { MetadataConfigController } from './metadata-config.controller.ts'
import { MetadataConfigService } from './metadata-config.service.ts'
import { DatasetTagConfigRepository, DatasetAttributeConfigRepository } from '../repository/index.ts'
import { RequestContextService } from '../../common/request-context.service.ts'

const imports = [DatabaseModule]

const injectables = [MetadataConfigService, DatasetTagConfigRepository, DatasetAttributeConfigRepository, RequestContextService]
@Module({
  imports,
  controllers: [MetadataConfigController],
  injectables
})
export class MetadataConfigModule {}
