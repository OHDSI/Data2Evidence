import jwt from 'jsonwebtoken'
import https from 'https'

interface IClientMetadata {
  issuerUrl: string
}

export interface IClientCredentials {
  clientId: string
  clientSecret: string
  scope: string
  resource?: string
}

interface ITokenResponse {
  access_token: string
}

export class OpenIDAPI {
  private readonly issuerUrl: string
  private readonly httpsAgent: https.Agent

  constructor({ issuerUrl }: IClientMetadata) {
    this.issuerUrl = issuerUrl.endsWith('/') ? issuerUrl : `${issuerUrl}/`

    // this.httpsAgent = new https.Agent({
    //   rejectUnauthorized: this.issuerUrl.startsWith('https://alp-logto-') ? false : true
    // })
  }

  async getClientCredentialsToken({ clientId, clientSecret, scope, resource }: IClientCredentials) {
    const params: any = {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
      resource
    }

    const body = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')

    let result: { data: ITokenResponse } | undefined
    try {
      // External-capable IdP — bypasses request-util (axios) deliberately.
      // See trex/plans/2026-07-27-axios-to-fetch-minimal-v3.md
      const res = await fetch(`${this.issuerUrl}token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body,
        signal: AbortSignal.timeout(30000)
      })
      if (!res.ok) {
        throw new Error(`IdP token request failed with status ${res.status}: ${await res.text()}`)
      }
      result = { data: (await res.json()) as ITokenResponse }
    } catch (err) {
      console.error('Error when getting client credentials token', err)
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
