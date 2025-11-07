import { Module, TokenInjector } from '@danet/core'
import { PostgresService } from './postgres.service.ts'

export const DATABASE = 'DATABASE'

@Module({
  imports: [],
  injectables: [
    new TokenInjector(PostgresService, DATABASE)
  ]
})
export class DatabaseModule { }