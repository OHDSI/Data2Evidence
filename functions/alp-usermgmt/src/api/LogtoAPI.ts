import { Service } from 'typedi'
import { del, get, patch, post } from './request-util'
import { BaseIDPAPI } from './BaseIDPAPI'
import { ILogtoUser, ILogtoUserCreated, ILogtoRole } from '../types'
import { env } from '../env'

@Service()
export class LogtoAPI extends BaseIDPAPI {
  private roleCache: Map<string, string> = new Map() // roleName -> roleId
  private resourceId: string | null = null

  private async getResourceId(): Promise<string> {
    if (this.resourceId) return this.resourceId

    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    const url = `${this.baseUrl}/api/resources`
    const result = await get<Array<{ id: string; indicator: string; isDefault?: boolean }>>(url, options)

    // Find the application resource (set as default during post-init), not the Management API
    const resource = result.data.find(r => r.isDefault)
    if (!resource) {
      throw new Error('Default application resource not found in Logto')
    }

    this.resourceId = resource.id
    return resource.id
  }

  private async ensureScopeForRole(roleId: string, scopeName: string): Promise<void> {
    this.logger.info(`Ensuring scope ${scopeName} exists for role ${roleId}`)

    const resourceId = await this.getResourceId()
    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })

    // Find or create scope on the resource
    const scopesUrl = `${this.baseUrl}/api/resources/${resourceId}/scopes`
    const existingScopes = await get<Array<{ id: string; name: string }>>(scopesUrl, options)
    let scope = existingScopes.data.find(s => s.name === scopeName)

    if (!scope) {
      this.logger.info(`Creating scope ${scopeName} on resource ${resourceId}`)
      const createResult = await post<{ id: string; name: string }>(
        scopesUrl,
        { name: scopeName, description: scopeName },
        options
      )
      scope = createResult.data
    }

    // Assign scope to role if not already assigned
    const roleScopesUrl = `${this.baseUrl}/api/roles/${roleId}/scopes`
    const existingRoleScopes = await get<Array<{ id: string; name: string }>>(roleScopesUrl, options)
    const alreadyAssigned = existingRoleScopes.data.some(s => s.id === scope!.id)

    if (!alreadyAssigned) {
      this.logger.info(`Assigning scope ${scopeName} to role ${roleId}`)
      await post(roleScopesUrl, { scopeIds: [scope.id] }, options)
    }
  }

  private async fetchAllPages<T>(path: string, pageSize = 100): Promise<T[]> {
    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    let page = 1
    const allItems: T[] = []

    while (true) {
      const url = `${this.baseUrl}${path}?page=${page}&page_size=${pageSize}`
      const result = await get<T[]>(url, options)
      allItems.push(...result.data)

      const totalNumber = Number(result.headers['total-number'])
      if (!totalNumber || allItems.length >= totalNumber) {
        break
      }
      page++
    }

    return allItems
  }
  async getUser(userId: string) {
    this.logger.info(`Get user ${userId}`)

    const options = await this.getRequestConfig('all' || '', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    const url = `${this.baseUrl}/api/users/${userId}`
    const result = await get<ILogtoUser>(url, options)
    return result.data
  }

  async createUser(username: string, password: string): Promise<ILogtoUserCreated> {
    this.logger.info(`Create user ${username}`)

    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    const url = `${this.baseUrl}/api/users`

    const data = {
      username: username,
      password
    }

    const result = await post<ILogtoUserCreated>(url, data, options)
    return result.data
  }

  async deleteUser(idpUserId: string) {
    this.logger.info(`Delete user ${idpUserId}`)

    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    const url = `${this.baseUrl}/api/users/${idpUserId}`
    await del(url, options)
  }

  async activateUser(idpUserId: string, active: boolean) {
    this.logger.info(`${active ? 'Activate' : 'Deactivate'} user ${idpUserId}`)

    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    const url = `${this.baseUrl}/api/users/${idpUserId}/is-suspended`
    const data = { isSuspended: !active }

    await patch(url, data, options)
  }

  async updatePassword(userId: string, password: string, oldPassword?: string) {
    this.logger.info(`Update password for ${userId}`)

    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })

    if (oldPassword) {
      const url = `${this.baseUrl}/api/users/${userId}/password/verify`
      const data = { password: oldPassword }
      const result = await post(url, data, options)
      if (result.status !== 204 && result.status !== 200) {
        this.logger.warn('Invalid old password')
        throw new Error('Invalid old password')
      }
    }

    const url = `${this.baseUrl}/api/users/${userId}/password`
    const data = { password }
    await patch(url, data, options)
  }

  async getUsers(): Promise<ILogtoUser[]> {
    this.logger.debug('Fetching all Logto users')
    return this.fetchAllPages<ILogtoUser>('/api/users')
  }

  // ============ Role Management Methods ============

  async getRoles(): Promise<ILogtoRole[]> {
    this.logger.debug('Fetching all Logto roles')
    return this.fetchAllPages<ILogtoRole>('/api/roles')
  }

  async getRoleByName(roleName: string): Promise<ILogtoRole | undefined> {
    // Check cache first
    if (this.roleCache.has(roleName)) {
      const roleId = this.roleCache.get(roleName)!
      return { id: roleId, name: roleName, description: '', type: 'User' }
    }

    const roles = await this.getRoles()
    // Update cache
    roles.forEach(role => this.roleCache.set(role.name, role.id))

    return roles.find(r => r.name === roleName)
  }

  async createRole(roleName: string, description?: string): Promise<ILogtoRole> {
    this.logger.info(`Creating Logto role: ${roleName}`)

    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    const url = `${this.baseUrl}/api/roles`
    const data = {
      name: roleName,
      description: description || `Role: ${roleName}`,
      type: 'User'
    }

    const result = await post<ILogtoRole>(url, data, options)

    // Update cache
    if (result.data?.id) {
      this.roleCache.set(roleName, result.data.id)
    }

    return result.data
  }

  async getUserRoles(idpUserId: string): Promise<ILogtoRole[]> {
    this.logger.debug(`Fetching roles for user ${idpUserId}`)
    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    const url = `${this.baseUrl}/api/users/${idpUserId}/roles`
    const result = await get<ILogtoRole[]>(url, options)
    return result.data
  }

  async assignRoleToUser(idpUserId: string, roleName: string, scopes?: string[]): Promise<void> {
    this.logger.info(`Assigning role ${roleName} to user ${idpUserId}`)

    let role = await this.getRoleByName(roleName)

    if (!role) {
      this.logger.info(`Role ${roleName} not found, creating it`)
      role = await this.createRole(roleName)
    }

    if (scopes?.length) {
      for (const scopeName of scopes) {
        await this.ensureScopeForRole(role.id, scopeName)
      }
    }

    // Check if user already has the role
    const userRoles = await this.getUserRoles(idpUserId)
    if (userRoles.some(r => r.id === role!.id)) {
      this.logger.debug(`User ${idpUserId} already has role ${roleName}`)
      return
    }

    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    const url = `${this.baseUrl}/api/users/${idpUserId}/roles`
    const data = { roleIds: [role.id] }

    await post(url, data, options)
    this.logger.info(`Successfully assigned role ${roleName} to user ${idpUserId}`)
  }

  async removeRoleFromUser(idpUserId: string, roleName: string): Promise<void> {
    this.logger.info(`Removing role ${roleName} from user ${idpUserId}`)

    const role = await this.getRoleByName(roleName)
    if (!role) {
      this.logger.warn(`Role ${roleName} not found in Logto, skipping removal`)
      return
    }

    const options = await this.getRequestConfig('all', { resource: env.IDP_ALP_ADMIN_RESOURCE })
    const url = `${this.baseUrl}/api/users/${idpUserId}/roles/${role.id}`

    await del(url, options)
    this.logger.info(`Successfully removed role ${roleName} from user ${idpUserId}`)
  }
}
