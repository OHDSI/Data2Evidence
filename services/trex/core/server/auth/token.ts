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

  const client = new OpenIDAPI({ issuerUrl: `https://${env.GATEWAY_WO_PROTOCOL_FQDN}/d2e/oauth/` })
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

  const sensitiveParamKeys = ['client_id', 'client_secret']
  const redactedParams = Array.from(params.entries())
    .map(([key, value]) => {
      if (sensitiveParamKeys.includes(key) && value != null) {
        return `${key}=[${String(value).length} chars]`
      }
      return `${key}=${value}`
    })
    .join('&')
  logger.info(`Exchanging token via ${tokenUrl} with params: ${redactedParams}`)

  const response = await post(tokenUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })

  const sensitiveKeys = ['access_token', 'id_token', 'refresh_token']
  const redactedResponse = response.data
    ? typeof response.data === 'object'
      ? Object.entries(response.data)
          .map(([key, value]) => {
            if (sensitiveKeys.includes(key) && value != null) {
              return `${key}=[${String(value).length} chars]`
            }
            return `${key}=${JSON.stringify(value)}`
          })
          .join(', ')
      : String(response.data)
    : '[no data]'
  logger.info(`Exchanged token via ${tokenUrl}, response status: ${response.status}: ${redactedResponse}`)

  if (response.data?.error) {
    logger.error(`Error while exchanging token: ${JSON.stringify(response.data)}`)
  }
  return response.data
}



