import { Module, TokenInjector } from '@danet/core'
import { PORTAL_REPOSITORY } from '../../common/const.ts'
import { RequestContextService } from '../../common/request-context.service.ts'
import { DatabaseModule } from '../../database/module.ts'
import { UserArtifactGroupRepository } from '../repository/user-artifact-group.repository.ts'
import { GroupController } from './group.controller.ts'
import { GroupService } from './group.service.ts'
@Module({
  imports: [DatabaseModule],
  injectables: [GroupService, UserArtifactGroupRepository, new TokenInjector(UserArtifactGroupRepository, PORTAL_REPOSITORY), RequestContextService],
  controllers: [GroupController],
})
export class GroupModule { }
