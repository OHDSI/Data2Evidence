import { Module } from '@danet/core'
import { UserMgmtApi } from './user-mgmt.api.ts'
import { UserMgmtService } from './user-mgmt.service.ts'
import { RequestContextService } from '../common/request-context.service.ts'

@Module({
  injectables: [UserMgmtService, UserMgmtApi, RequestContextService],
})
export class UserMgmtModule { }
