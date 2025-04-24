import { AxiosResponse } from 'npm:axios'
import jwt from 'npm:jsonwebtoken'
import { post } from './request-util.ts'
import {logger} from '../env.ts'
interface IClientMetadata {
  issuerUrl: string
}

interface IClientCredentials {
  clientId: string
  clientSecret: string
  scope: string
}

interface ITokenResponse {
  access_token: string
}

export class OpenIDAPI {
  private readonly issuerUrl: string

  constructor({ issuerUrl }: IClientMetadata) {
    this.issuerUrl = issuerUrl.endsWith('/') ? issuerUrl : `${issuerUrl}/`
  }

  async getClientCredentialsToken({ clientId, clientSecret, scope }: IClientCredentials) {
    const params: any = {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope
    }

    const body = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')

    let result: AxiosResponse<ITokenResponse> | undefined
    try {
      result = await post<ITokenResponse>(`${this.issuerUrl}token`, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    } catch (err) {
      logger.error('Error when getting client credentials token' + err)
    }

    return result?.data
  }

  isTokenExpiredOrEmpty(token?: string) {
    if (!token) {
      return true
    } else {
      const decodedToken = jwt.decode(token) as jwt.JwtPayload
      return decodedToken?.exp && decodedToken.exp < Date.now() / 1000
    }
  }
}
