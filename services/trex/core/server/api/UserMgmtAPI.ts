import { AxiosRequestConfig } from 'npm:axios'
import { post } from './request-util.ts'
import { env } from '../env.ts'

export class UserMgmtAPI {
  private readonly baseURL: string

  constructor() {
    if (env.SERVICE_ROUTES.usermgmt) {
      this.baseURL = env.SERVICE_ROUTES.usermgmt
    } else {
      throw new Error('No url is set for UserMgmtAPI')
    }
  }

  async getUserGroups(token: string, userId: string) {
    const options: AxiosRequestConfig = {
      headers: {
        Authorization: token
      }
    }
    const url = `${this.baseURL}/user-group/list`
    const result = await post(url, { userId }, options)
    return result.data
  }
}
