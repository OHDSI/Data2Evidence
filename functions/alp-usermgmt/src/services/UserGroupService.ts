import type { Knex } from '../types'
import { Container ,  Service } from 'typedi'
import { v4 as uuidv4 } from 'uuid'
import { CONTAINER_KEY, ROLES } from '../const'
import { UserGroup } from '../entities'
import { UserGroupExt } from '../dtos'
import { UserGroupCriteria, UserGroupExtCriteria, UserGroupField, UserGroupRepository } from '../repositories'
import { B2cGroupService } from './B2cGroupService'
import { UserService } from './UserService'
import { ITokenUser, RoleMap, UserGroupMetadata } from '../types'
import { createLogger } from '../Logger'
import { PortalAPI } from '../api'

@Service()
export class UserGroupService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly portalAPI: PortalAPI,
    private readonly userGroupRepo: UserGroupRepository,
    private readonly groupService: B2cGroupService,
    private readonly userService: UserService
  ) {}

  async getUserGroupsMetadata(userId: string, tenantId?: string, system?: string): Promise<UserGroupMetadata> {
    if (!userId) return {} as UserGroupMetadata

    const groups = await this.userGroupRepo.getGroupsByUser(userId, tenantId, system)
    const alpInfo = this.extractTenantAndRoles(groups)

    const result: UserGroupMetadata = {
      userId,
      groups: groups.map(group => B2cGroupService.getDisplayName(group.role, group.tenantId, group.studyId)),
      alpRoleMap: {
        ALP_USER_ADMIN: alpInfo.alp_role_user_admin,
        ALP_SYSTEM_ADMIN: alpInfo.alp_role_system_admin,
        ALP_NIFI_ADMIN: alpInfo.alp_role_nifi_admin,
        ALP_DASHBOARD_VIEWER: alpInfo.alp_role_dashboard_viewer,
        TENANT_ADMIN: alpInfo.alp_role_tenant_admin,
        TENANT_VIEWER: alpInfo.alp_role_tenant_viewer,
        STUDY_MANAGER: alpInfo.alp_role_study_mgr,
        STUDY_RESEARCHER: alpInfo.alp_role_study_researcher,
        STUDY_WRITE_DQD_RESEARCHER: alpInfo.alp_role_study_write_dqd_researcher
      },
      ...alpInfo
    }
    return result
  }

  async getUserGroupExtList(
    criteria: { [key in keyof UserGroupExtCriteria]?: UserGroupExtCriteria[key] } = {}
  ): Promise<UserGroupExt[]> {
    return await this.userGroupRepo.getUserGroupExtList(criteria)
  }

  async getUserGroup(userId: string, b2cGroupId: string): Promise<UserGroup | undefined> {
    const criteria: Partial<UserGroupCriteria> = { user_id: userId, b2c_group_id: b2cGroupId }
    return await this.userGroupRepo.getOne(criteria)
  }

  async getUserGroups(userId: string): Promise<UserGroupExt[]> {
    return await this.userGroupRepo.getGroupsByUser(userId)
  }

  async userGroupExists(userId: string, b2cGroupId: string, trx?: Knex): Promise<boolean> {
    const criteria: Partial<UserGroupCriteria> = { user_id: userId, b2c_group_id: b2cGroupId }
    return await this.userGroupRepo.exists(criteria, trx)
  }

  async isExistingMember(username: string, tenantId: string): Promise<boolean> {
    const userGroups = await this.userGroupRepo.getUserGroupExtList({ username, tenant_id: tenantId })
    return userGroups.length > 0
  }

  async registerUserToGroup(
    userId: string,
    groupId: string,
    trx?: Knex,
    options?: { skipUserValidation?: boolean }
  ): Promise<undefined> {
    this.logger.debug(`Register user ${userId} to group ${groupId}`)

    const opt = options || {}
    const user = await this.userService.getUser(userId, trx)
    if (!opt.skipUserValidation && !user) {
      this.logger.error(`Skip registering user ${userId} to group ${groupId}. User does not exist`)
      throw Error(`User ${userId} does not exist`)
    }

    const userGroup = await this.getUserGroup(userId, groupId)
    if (userGroup) {
      this.logger.warn(`Skip registering user ${userId} to group ${groupId}. User group already exist`)
      return
    }

    this.addUserToGroup(userId, groupId, trx)
  }

  async addUserToGroup(userId: string, groupId: string, trx?: Knex) {
    this.logger.info(`Add user ${userId} to group ${groupId}`)

    const tokenUser = Container.get<ITokenUser>(CONTAINER_KEY.CURRENT_USER)

    const newUserGroup: Partial<UserGroupField> = {
      id: uuidv4(),
      user_id: userId,
      b2c_group_id: groupId
    }
    return await this.userGroupRepo.create(newUserGroup, tokenUser, trx)
  }

  async registerUsersToGroups(userIds: string[], groupIds: string[]): Promise<{ userId: string }[]> {
    const result: { userId: string }[] = []
    this.logger.debug(`Register user ${JSON.stringify(userIds)} to group ${JSON.stringify(groupIds)}`)

    const trx = await this.userGroupRepo.getTransaction()
    try {
      for (const userId of userIds) {
        for (const groupId of groupIds) {
          await this.registerUserToGroup(userId, groupId, trx)
          result.push({ userId })
        }
      }
      trx.commit()
      return result
    } catch (err) {
      trx.rollback()
      throw err
    }
  }

  async withdrawUserFromGroup(userId: string, groupId: string, trx?: Knex): Promise<undefined> {
    const userGroup = await this.getUserGroup(userId, groupId)
    if (!userGroup) {
      this.logger.warn(`User ${userId} does not belong to group ${groupId}`)
      return
    }

    await this.userGroupRepo.delete({ user_id: userId, b2c_group_id: groupId }, trx)
  }

  async withdrawUserFromGroups(userId: string, groupIds: string[]): Promise<void> {
    this.logger.info(`Withdrawing user ${userId} from groups ${JSON.stringify(groupIds)}`)

    const trx = await this.userGroupRepo.getTransaction()
    try {
      for (const groupId of groupIds) {
        this.logger.debug(`Withdrawing user ${userId} from group ${groupId}`)
        await this.withdrawUserFromGroup(userId, groupId, trx)
      }
      await trx.commit()
    } catch (err) {
      await trx.rollback()
      throw err
    }
  }

  async withdrawUserFromTenant(userId: string, tenantId: string): Promise<void> {
    this.logger.info(`Withdrawing user ${userId} from tenant ${tenantId}`)

    const groups = await this.getUserGroupExtList({ user_id: userId, tenant_id: tenantId })
    this.logger.debug(`Withdrawing user ${userId} from groups ${JSON.stringify(groups)}`)

    const groupIds = groups.map(g => g.b2cGroupId)
    await this.withdrawUserFromGroups(userId, groupIds)
  }

  async isRole(userId: string, role: string): Promise<boolean> {
    if (!userId) return false
    if (!role) return false

    const userGroups = await this.userGroupRepo.getList({ user_id: userId })
    if (userGroups.length === 0) return false

    const groupIds = userGroups.map(ug => ug.b2cGroupId)
    const groups = await this.groupService.getGroupsByIds(groupIds)
    return groups.some(g => g.role === role)
  }

  private extractTenantAndRoles = (groups: UserGroupExt[]) => {
    const tenantIds = groups
      .filter(group => !!group.tenantId)
      .map(group => group.tenantId!)
      .filter((tenantId, index, self) => self.indexOf(tenantId) === index)

    const fn = (role: string, prop: 'tenantId' | 'studyId') =>
      groups.filter(group => group.role === role).map(group => group[prop]!)

    const roleMap: RoleMap = {
      alp_tenant_id: tenantIds,
      alp_role_user_admin: groups.some(group => group.role === ROLES.ALP_USER_ADMIN),
      alp_role_system_admin: groups.some(group => group.role === ROLES.ALP_SYSTEM_ADMIN),
      alp_role_nifi_admin: groups.some(group => group.role === ROLES.ALP_NIFI_ADMIN),
      alp_role_dashboard_viewer: groups.some(group => group.role === ROLES.ALP_DASHBOARD_VIEWER),
      alp_role_study_write_dqd_researcher: groups.some(group => group.role === ROLES.STUDY_WRITE_DQD_RESEARCHER),
      alp_role_tenant_admin: fn(ROLES.TENANT_ADMIN, 'tenantId'),
      alp_role_tenant_viewer: fn(ROLES.TENANT_VIEWER, 'tenantId'),
      alp_role_study_admin: fn(ROLES.STUDY_ADMIN, 'studyId'),
      alp_role_study_mgr: fn(ROLES.STUDY_MANAGER, 'studyId'),
      alp_role_study_researcher: fn(ROLES.STUDY_RESEARCHER, 'studyId'),
    }

    return roleMap
  }
}
