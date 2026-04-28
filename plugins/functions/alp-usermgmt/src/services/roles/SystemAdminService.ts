import { ROLES } from '../../const'
import { Service } from 'typedi'
import { B2cGroupService } from '../B2cGroupService'
import { UserGroupService } from '../UserGroupService'
import { createLogger } from '../../Logger'
@Service()
export class SystemAdminService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(private readonly groupService: B2cGroupService, private readonly userGroupService: UserGroupService) {}

  async register(userId: string, system: string): Promise<void> {
    const group = await this.groupService.getGroupBySystemRole(system, ROLES.ALP_SYSTEM_ADMIN)
    if (!group?.id) {
      this.logger.warn(`Unable to find group for role ${ROLES.ALP_SYSTEM_ADMIN}`)
      throw new Error(`Unable to find group for role ${ROLES.ALP_SYSTEM_ADMIN}`)
    }

    this.logger.info(`Register ALP system admin for ${userId}`)
    return await this.userGroupService.registerUserToGroup(userId, group.id)
  }

  async withdraw(userId: string, system: string): Promise<void> {
    const group = await this.groupService.getGroupBySystemRole(system, ROLES.ALP_SYSTEM_ADMIN)
    if (!group?.id) {
      this.logger.warn(`Unable to find group for role ${ROLES.ALP_SYSTEM_ADMIN}`)
      throw new Error(`Unable to find group for role ${ROLES.ALP_SYSTEM_ADMIN}`)
    }

    this.logger.info(`Withdraw ALP system admin for ${userId}`)
    return await this.userGroupService.withdrawUserFromGroup(userId, group.id)
  }
}
