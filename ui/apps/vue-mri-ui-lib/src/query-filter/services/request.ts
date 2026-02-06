import axios from 'axios'
import { getPortalAPI } from '../../utils/PortalUtils'

export const client = axios.create()

client.interceptors.request.use(
  async config => {
    const portalAPI = getPortalAPI()

    // Add Bearer token
    const bearerToken = portalAPI ? await portalAPI.getToken() : localStorage.getItem('msaltoken')
    if (bearerToken && config.headers) {
      config.headers.Authorization = `Bearer ${bearerToken}`
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Retry logic for ERR_NETWORK_CHANGED errors (Docker container restarts during e2e tests)
client.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config
    if (!config) return Promise.reject(error)

    const isNetworkChanged = error.code === 'ERR_NETWORK' || error.message?.includes('ERR_NETWORK_CHANGED')

    if (isNetworkChanged) {
      config.__retryCount = config.__retryCount || 0
      if (config.__retryCount < 3) {
        config.__retryCount += 1
        console.warn(`[MRI UI API] ERR_NETWORK_CHANGED, retrying in 10s (attempt ${config.__retryCount}/3)...`)
        await new Promise(resolve => setTimeout(resolve, 10000))
        return client.request(config)
      }
    }

    return Promise.reject(error)
  }
)
