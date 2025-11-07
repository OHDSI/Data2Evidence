import { AxiosRequestConfig } from 'axios'
import { createLogger } from '../Logger'
import { Container ,  Service } from 'typedi'
import { CONTAINER_KEY } from '../const'
import { post, put, del, get } from './request-util'
import { env } from '../env'

@Service()
export class NifiManagementAPI {
  private readonly baseURL: string | undefined
  private readonly logger = createLogger(this.constructor.name)

  constructor() {
    this.baseURL = env.NIFI_MGMT_BASE_URL

    if (!this.baseURL) {
      this.logger.error('No baseURL is set for NifiManagementAPI')
      throw new Error('No baseURL is set for NifiManagementAPI')
    }
  }

  private getRequestConfig() {
    let options: AxiosRequestConfig = {}

    const authHeader = Container.get<string>(CONTAINER_KEY.AUTHORIZATION_HEADER)
    if (authHeader) {
      options = {
        ...options,
        headers: {
          Authorization: authHeader
        }
      }
    }

    return options
  }

  async getUser(email: string, nifiService: string): Promise<boolean> {
    const options = this.getRequestConfig()

    // Check if user exist in nifi service
    try {
      const url = `${this.baseURL}${nifiService}/security/user/${email}`
      await get(url, options)
      return true
    } catch (error) {
      this.logger.error(`Failed to get user for ${nifiService}`)
      this.logger.error(error.response.data.msg)
      return false
    }
  }

  async getUserGroupIdentities(email: string, nifiService: string): Promise<string[]> {
    const options = this.getRequestConfig()

    // Get user group identities
    try {
      const url = `${this.baseURL}${nifiService}/security/user/user-group-identities/${email}`
      const result = await get(url, options)
      return result.data
    } catch (error) {
      this.logger.error(`Failed to get user group identities for ${nifiService}`)
      throw error
    }
  }

  async addUser(email: string, nifiService: string): Promise<any> {
    const options = this.getRequestConfig()

    try {
      // add user in nifi service
      const url = `${this.baseURL}${nifiService}/security/user`
      const data = { userIdentity: email }

      const result = await post(url, data, options)

      return result
    } catch (error) {
      this.logger.error(`Failed to add user for ${nifiService}`)
      throw error
    }
  }

  async removeUser(email: string, nifiService: string): Promise<any> {
    const options = this.getRequestConfig()

    try {
      // remove user in nifi service
      options.data = { userIdentity: email }
      const url = `${this.baseURL}${nifiService}/security/user`

      const result = await del(url, options)

      return result
    } catch (error) {
      this.logger.error(`Failed to remove user for ${nifiService}`)
      throw error
    }
  }

  async addUserToAdminGroup(email: string, nifiService: string): Promise<any> {
    const options = this.getRequestConfig()

    try {
      // add user to admin group in nifi service
      const url = `${this.baseURL}${nifiService}/security/user/add/user-group`
      const data = { userIdentity: email, userGroupIdentity: 'admin' }

      const result = await put(url, data, options)

      return result
    } catch (error) {
      this.logger.error(`Failed to add user to admin group for ${nifiService}`)
      throw error
    }
  }

  async removeUserFromAdminGroup(email: string, nifiService: string): Promise<any> {
    const options = this.getRequestConfig()

    try {
      // remove user from admin group in nifi service
      const url = `${this.baseURL}${nifiService}/security/user/remove/user-group`
      const data = { userIdentity: email, userGroupIdentity: 'admin' }

      const result = await put(url, data, options)

      return result
    } catch (error) {
      this.logger.error(`Failed to remove user to admin group for ${nifiService}`)
      throw error
    }
  }
}
