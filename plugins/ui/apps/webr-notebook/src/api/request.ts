import axios from 'axios'

let tokenProvider: (() => Promise<string>) | null = null

export function setTokenProvider(getToken: () => Promise<string>) {
  tokenProvider = getToken
}

const client = axios.create({
  baseURL: '/system-portal/notebook',
})

client.interceptors.request.use(
  async (config) => {
    if (tokenProvider) {
      try {
        const token = await tokenProvider()
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        console.error('Failed to get auth token:', error)
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    if (!config) return Promise.reject(error)

    const isNetworkError =
      error.code === 'ERR_NETWORK' || error.message?.includes('ERR_NETWORK_CHANGED')

    if (isNetworkError) {
      config.__retryCount = config.__retryCount ?? 0
      if (config.__retryCount < 3) {
        config.__retryCount += 1
        console.warn(
          `[Notebook API] Network error, retrying in 10s (attempt ${config.__retryCount}/3)...`
        )
        await new Promise((resolve) => setTimeout(resolve, 10_000))
        return client.request(config)
      }
    }

    return Promise.reject(error)
  }
)

export { client as request }
