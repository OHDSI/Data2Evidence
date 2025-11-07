import { createApi, PrefectConfig } from '@prefecthq/prefect-ui-library'

import { InjectionKey } from 'vue'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createPrefectApi(config: PrefectConfig) {
  const workspaceApi = createApi(config)

  return {
    ...workspaceApi
  }
}

export type CreatePrefectApi = ReturnType<typeof createPrefectApi>

export const prefectApiKey: InjectionKey<CreatePrefectApi> = Symbol('PrefectApi')
