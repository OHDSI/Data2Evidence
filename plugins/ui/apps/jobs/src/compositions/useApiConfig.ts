import { PrefectConfig } from '@prefecthq/prefect-ui-library'
import { getPortalAPI } from '@/utils/portalApi'
export type UseWorkspaceApiConfig = {
  config: PrefectConfig
}
export async function useApiConfig(): Promise<UseWorkspaceApiConfig> {
  const { getAuthToken } = getPortalAPI()

  const baseURL = 'prefect/api'
  const token = await getAuthToken()

  if (!token) {
    throw new Error('No auth token present')
  }

  const config: PrefectConfig = {
    baseUrl: baseURL,
    token: token
  }

  return { config }
}
