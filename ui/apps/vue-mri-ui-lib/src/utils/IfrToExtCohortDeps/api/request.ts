import axios, { AxiosRequestConfig } from 'axios'
import { getPortalAPI } from '@/utils/PortalUtils'

const portalAPI = getPortalAPI()
const BASE_URL = portalAPI?.qeSvcUrl || process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000'

const client = axios.create({ baseURL: BASE_URL })

client.interceptors.request.use(
  async config => {
    if (portalAPI) {
      const token = await portalAPI.getToken()
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

const request = <T = any>(options: AxiosRequestConfig): Promise<T> => {
  const onSuccess = function (response: any) {
    console.debug('Request Successful!', response)
    return response.data
  }

  const onError = function (error: any) {
    console.error('Request Failed:', error.config)

    if (error.response) {
      // Server response error
      console.error('Status:', error.response.status)
      console.error('Data:', error.response.data)
      console.error('Headers:', error.response.headers)
    } else {
      // Request setup error
      console.error('Error Message:', error.message)
    }

    return Promise.reject(error.response || error.message)
  }

  return client(options).then(onSuccess).catch(onError)
}

export default request

