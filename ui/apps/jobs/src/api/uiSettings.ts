import axios from 'axios'
import { mapper } from '@/utils/mapper'
import { SettingsResponse } from '@/types/settingsResponse'
import { getPortalAPI } from '@/utils/portalApi'
import { FeatureFlag } from '@/utils/permissions'

export type Settings = {
  apiUrl: string
  csrfEnabled: boolean
  flags: FeatureFlag[]
}

const { getAuthToken } = getPortalAPI()

export class UiSettings {
  public static settings: Settings | null = null

  private static promise: Promise<Settings> | null = null
  private static readonly baseUrl = '/prefect'

  public static async load(): Promise<Settings> {
    if (this.settings !== null) {
      return this.settings
    }

    if (this.promise !== null) {
      return this.promise
    }

    const token = await getAuthToken()

    if (!token) {
      throw new Error('No auth token present')
    }

    this.promise = new Promise((resolve) => {
      return axios
        .get<SettingsResponse>('/ui-settings', {
          baseURL: this.baseUrl,
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        .then(({ data }) => mapper.map('SettingsResponse', data, 'Settings'))
        .then(resolve)
    })

    const settings = await this.promise
    return (this.settings = settings)
  }

  public static async get<T extends keyof Settings>(
    setting: T,
    defaultValue?: Settings[T]
  ): Promise<Settings[T]> {
    await this.load()

    const value = this.settings?.[setting]

    if (value === undefined) {
      if (defaultValue) {
        return defaultValue
      }

      throw `UI setting "${setting}" does not exist and no default was provided.`
    }

    return value
  }
}

export const uiSettings: {
  getApiUrl: () => Promise<string>
  getFeatureFlags: () => Promise<FeatureFlag[]>
} = {
  getApiUrl: () => {
    return UiSettings.get('apiUrl')
  },
  getFeatureFlags: () => {
    return UiSettings.get('flags')
  }
}
