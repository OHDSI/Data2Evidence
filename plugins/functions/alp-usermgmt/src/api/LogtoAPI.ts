import { Service } from 'typedi'
import { del, get, patch, post } from './request-util'
import { BaseIDPAPI } from './BaseIDPAPI'
import { ILogtoUser, ILogtoUserCreated } from '../types'
import { env } from '../env'

@Service()
export class LogtoAPI extends BaseIDPAPI {
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
}
