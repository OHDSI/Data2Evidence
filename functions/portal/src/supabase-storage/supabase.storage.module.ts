import { Module } from '@danet/core'
import { SupabaseStorageClient } from './supabase.storage.client.ts'

@Module({
  injectables: [SupabaseStorageClient]
})
export class SupabaseStorageModule { }