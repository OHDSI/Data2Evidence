import https from 'node:https'
import { env, logger } from '../env.ts'
import { OpenIDAPI } from '../api/OpenIDAPI.ts'
import { post } from '../api/request-util.ts'

const authType = 'logto'

export const getClientCredentialsToken = async () => {
  let clientId: string | undefined,
    clientSecret: string | undefined,
    scope: string = ''

  if (authType === 'logto') {
    clientId = env.LOGTO_SVC_CLIENT_ID
    clientSecret = env.LOGTO_SVC_CLIENT_SECRET
    scope = 'openid'
  }

  if (!clientId || !clientSecret) {
    logger.error('Client ID and secret is required to acquire token')
    return
  }

  const client = new OpenIDAPI({ issuerUrl: `https://${env.GATEWAY_WO_PROTOCOL_FQDN}/oauth/` })
  return await client.getClientCredentialsToken({ clientId, clientSecret, scope })
}

export const exchangeToken = async (params: URLSearchParams) => {
  let tokenUrl: string | undefined, clientSecret: string | undefined, resource: string | undefined
  if (authType === 'logto') {
    clientSecret = env.LOGTO_CLIENT_SECRET
    tokenUrl = env.LOGTO_TOKEN_URL
    resource = env.LOGTO_RESOURCE_API
  }

  if (!params.has('client_secret') && clientSecret) {
    params.append('client_secret', clientSecret)
  }

  if (!params.has('resource') && resource) {
    params.append('resource', resource)
  }

  if (!tokenUrl) {
    logger.error('Token URL is required to exchange token')
    return
  }

  const response = await post(tokenUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
  })

  if (response.data?.error) {
    logger.error(`Error while exchanging token: ${JSON.stringify(response.data)}`)
  }
  return response.data
}



