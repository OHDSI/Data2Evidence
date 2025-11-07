import { Injectable, SCOPE } from '@danet/core'
import { RequestContextService } from '../../common/request-context.service.ts'
import { UserArtifactGroup } from '../entity/user-artifact-group.entity.ts'
import { UserArtifactGroupRepository } from '../repository/user-artifact-group.repository.ts'
@Injectable({ scope: SCOPE.REQUEST })
export class GroupService {
  private readonly userId: string
  constructor(
    private readonly groupRepository: UserArtifactGroupRepository,
    private readonly requestContextService: RequestContextService
  ) {
    this.userId = this.requestContextService.getAuthToken()?.sub
  }

  async addUserToGroup(userId: string): Promise<UserArtifactGroup> {
    const group = await this.groupRepository.create(this.addOwner({ userId }, true))
    return this.groupRepository.save(group)
  }

  async removeUserFromGroup(userId: string): Promise<void> {
    await this.groupRepository.delete(userId)
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.groupRepository.findOne(userId)
    return !!user
  }

  private addOwner<T>(object: T, isNewEntity = false) {
    if (isNewEntity) {
      return {
        ...object,
        createdBy: this.userId,
        modifiedBy: this.userId
      }
    }
    return {
      ...object,
      modifiedBy: this.userId
    }
  }
}