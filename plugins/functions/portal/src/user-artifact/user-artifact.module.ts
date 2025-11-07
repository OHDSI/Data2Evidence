import { Module, TokenInjector } from '@danet/core'
import { DatabaseModule } from '../database/module.ts'
import { PORTAL_REPOSITORY } from '../common/const.ts'
import { GroupModule } from './group/group.module.ts'
import { UserArtifactRepository } from './repository/user-artifact.repository.ts'
import { UserArtifactController } from './user-artifact.controller.ts'
import { UserArtifactService } from './user-artifact.service.ts'

@Module({
  imports: [DatabaseModule, GroupModule],
  injectables: [UserArtifactService, UserArtifactRepository, new TokenInjector(UserArtifactRepository, PORTAL_REPOSITORY)
  ],
  controllers: [UserArtifactController]
})
export class UserArtifactModule { }
