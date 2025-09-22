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
