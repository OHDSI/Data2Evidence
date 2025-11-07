import { ROLES } from '../../const'
import { Service } from 'typedi'
import { UserGroupRepository } from '../../repositories'
import { B2cGroupService } from '../B2cGroupService'
import { UserGroupService } from '../UserGroupService'
import { createLogger } from '../../Logger'
import { UserGroupExt } from '../../dtos/UserGroupExt.ts'
import { B2cGroup } from '../../entities/B2cGroup.ts'
import { NifiManagementAPI } from '../../api'
import { UserService } from '../UserService'

@Service()
export class NifiAdminService {
  private static ROLE = ROLES.ALP_NIFI_ADMIN

  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly userGroupRepo: UserGroupRepository,
    private readonly groupService: B2cGroupService,
    private readonly userGroupService: UserGroupService,
    private readonly nifiManagementAPI: NifiManagementAPI,
    private readonly userService: UserService
  ) {}

  async getUsers(): Promise<UserGroupExt[]> {
    return await this.userGroupService.getUserGroupExtList({ role: NifiAdminService.ROLE })
  }

  async getGroup(): Promise<B2cGroup | undefined> {
    return await this.groupService.getGroupByRole(NifiAdminService.ROLE)
  }

  async isGranted(userId: string): Promise<boolean> {
    if (!userId) return false

    const userGroups = await this.userGroupRepo.getList({ user_id: userId })
    if (userGroups.length === 0) return false

    const groupIds = userGroups.map(ug => ug.b2cGroupId)
    const groups = await this.groupService.getGroupsByIds(groupIds)
    return groups.some(g => g.role === NifiAdminService.ROLE)
  }

  async registerUser(userId: string, system: string): Promise<void> {
    const group = await this.groupService.getGroupBySystemRole(system, NifiAdminService.ROLE)
    if (!group?.id) {
      this.logger.warn(`Unable to find group for role ${NifiAdminService.ROLE}`)
      throw new Error(`Unable to find group for role ${NifiAdminService.ROLE}`)
    }

    const user = await this.userService.getUser(userId)
    if (!user?.username) {
      this.logger.warn(`Unable to find email for user ${userId}`)
      throw new Error(`Unable to find email for user ${userId}`)
    }
    const email = user.username

    // Check if user exist in nifi
    const nifiUserExists = await this.nifiManagementAPI.getUser(email, 'nifi')
    try {
      if (!nifiUserExists) {
        await this.nifiManagementAPI.addUser(email, 'nifi')
      }

      // Get user group identities
      const userGroupIdentities = await this.nifiManagementAPI.getUserGroupIdentities(email, 'nifi')
      // Add user to nifi admin group if user is not in admin group
      if (!userGroupIdentities.includes('admin')) {
        await this.nifiManagementAPI.addUserToAdminGroup(email, 'nifi')
      }
    } catch (error) {
      this.logger.warn(`Unable to register user ${email} to Nifi Management. ${error}`)
      throw new Error(`Unable to register user ${email} to Nifi Management. ${error}`)
    }

    // Check if user exist in nifi-registry
    const nifiRegistryUserExists = await this.nifiManagementAPI.getUser(email, 'nifi-registry')
    try {
      if (!nifiRegistryUserExists) {
        await this.nifiManagementAPI.addUser(email, 'nifi-registry')
      }
      // Get user group identities
      const userGroupIdentities = await this.nifiManagementAPI.getUserGroupIdentities(email, 'nifi-registry')
      // Add user to nifi-registry admin group if user is not in admin group
      if (!userGroupIdentities.includes('admin')) {
        await this.nifiManagementAPI.addUserToAdminGroup(email, 'nifi-registry')
      }
    } catch (error) {
      this.logger.warn(`Unable to register user ${email} to Nifi Registry Management. ${error}`)
      throw new Error(`Unable to register user ${email} to Nifi Registry Management. ${error}`)
    }

    this.logger.info(`Register ${NifiAdminService.ROLE} for ${userId}`)
    return await this.userGroupService.registerUserToGroup(userId, group.id)
  }

  async withdrawUser(userId: string, system: string): Promise<void> {
    const group = await this.groupService.getGroupBySystemRole(system, NifiAdminService.ROLE)
    if (!group?.id) {
      this.logger.warn(`Unable to find group for role ${NifiAdminService.ROLE}`)
      throw new Error(`Unable to find group for role ${NifiAdminService.ROLE}`)
    }

    const user = await this.userService.getUser(userId)
    if (!user?.username) {
      this.logger.warn(`Unable to find email for user ${userId}`)
      throw new Error(`Unable to find email for user ${userId}`)
    }

    const email = user.username

    // Check if user exists in nifi
    const nifiUserExists = await this.nifiManagementAPI.getUser(email, 'nifi')
    if (nifiUserExists) {
      // Remove user from admin group and remove user in nifi
      try {
        // Get user group identities
        const userGroupIdentities = await this.nifiManagementAPI.getUserGroupIdentities(email, 'nifi')
        // Remove user from nifi admin group if user is in admin group
        if (userGroupIdentities.includes('admin')) {
          await this.nifiManagementAPI.removeUserFromAdminGroup(email, 'nifi')
        }
        await this.nifiManagementAPI.removeUser(email, 'nifi')
      } catch (error) {
        this.logger.warn(`Unable to withdraw user ${email} from Nifi Management. ${error}`)
        throw new Error(`Unable to withdraw user ${email} from Nifi Management. ${error}`)
      }
    }

    // Check if user exists in nifi-registry
    const nifiRegistryUserExists = await this.nifiManagementAPI.getUser(email, 'nifi-registry')
    if (nifiRegistryUserExists) {
      // Remove user from admin group and remove user in nifi-registry
      try {
        // Get user group identities
        const userGroupIdentities = await this.nifiManagementAPI.getUserGroupIdentities(email, 'nifi-registry')
        // Remove user from nifi admin group if user is in admin group
        if (userGroupIdentities.includes('admin')) {
          await this.nifiManagementAPI.removeUserFromAdminGroup(email, 'nifi-registry')
        }
        await this.nifiManagementAPI.removeUser(email, 'nifi-registry')
      } catch (error) {
        this.logger.warn(`Unable to withdraw user ${email} from Nifi Registry Management. ${error}`)
        throw new Error(`Unable to withdraw user ${email} from Nifi Registry Management. ${error}`)
      }
    }

    this.logger.info(`Withdraw ${NifiAdminService.ROLE} for ${userId}`)
    return await this.userGroupService.withdrawUserFromGroup(userId, group.id)
  }
}
