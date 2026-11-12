import { Module } from '@danet/core'
import { SupabaseStorageModule } from '../../supabase-storage/supabase.storage.module.ts'
import { ResourceController } from './resource.controller.ts'
import { ResourceService } from './resource.service.ts'
import { RequestContextService } from '../../common/request-context.service.ts'

const imports = [SupabaseStorageModule]
@Module({
  imports,
  controllers: [ResourceController],
  injectables: [ResourceService, RequestContextService]
})
export class ResourceModule {}
