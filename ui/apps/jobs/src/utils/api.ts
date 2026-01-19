import { createApi, PrefectConfig } from '@prefecthq/prefect-ui-library'
import { InjectionKey } from 'vue'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type AxiosInstanceSetupHook = NonNullable<Parameters<typeof createApi>[1]>

/**
 * Setup hook to add retry logic for ERR_NETWORK_CHANGED errors.
 * This error occurs when Docker containers start up and cause network
 * interface changes, which can interrupt in-flight HTTP requests.
 */
const setupNetworkErrorHandler: AxiosInstanceSetupHook = (instance) => {
  const maxRetries = 3
  const retryDelay = 10000 // 10 seconds

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config
      if (!config) {
        return Promise.reject(error)
      }

      if (error.code === 'ERR_NETWORK_CHANGED') {
        config.__retryCount = config.__retryCount || 0

        if (config.__retryCount < maxRetries) {
          config.__retryCount += 1
          console.warn(
            `[Jobs API] ERR_NETWORK_CHANGED, retrying in ${retryDelay / 1000}s (attempt ${config.__retryCount}/${maxRetries})...`
          )
          await sleep(retryDelay)
          return instance.request(config)
        }
      }

      return Promise.reject(error)
    }
  )
}

export function createPrefectApi(config: PrefectConfig) {
  const workspaceApi = createApi(config, setupNetworkErrorHandler)

  return {
    ...workspaceApi
  }
}

export type CreatePrefectApi = ReturnType<typeof createPrefectApi>

export const prefectApiKey: InjectionKey<CreatePrefectApi> = Symbol('PrefectApi')
