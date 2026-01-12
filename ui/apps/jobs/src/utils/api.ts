import { createApi, PrefectConfig, CreateApi } from '@prefecthq/prefect-ui-library'

import { InjectionKey } from 'vue'

export function createPrefectApi(config: PrefectConfig): CreateApi {
  const workspaceApi = createApi(config)

  return {
    ...workspaceApi
  }
}

export const prefectApiKey: InjectionKey<CreateApi> = Symbol('PrefectApi')
