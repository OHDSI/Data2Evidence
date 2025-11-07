import { Module } from '@danet/core'
import { SupabaseStorageClient } from './supabase.storage.client.ts'
import { SupabaseStorageController } from './supabase.storage.controller.ts'

@Module({
  controllers: [SupabaseStorageController],
  injectables: [SupabaseStorageClient]
})
export class SupabaseStorageModule { }