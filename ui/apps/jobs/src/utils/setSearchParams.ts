import { getPortalAPI } from './portalApi'

const { browserBaseUrl } = getPortalAPI()

export const setSearchParams = (
  params: {
    key: string
    value?: string
  }[]
) => {
  const queryParams = new URLSearchParams(window.location.search)
  params.forEach(({ key, value }) => {
    if (typeof value === 'string') {
      queryParams.set(key, value)
    } else {
      queryParams.delete(key)
    }
  })
  history.pushState(
    null,
    '',
    `${browserBaseUrl}${queryParams.size ? '?' : ''}${queryParams.toString()}`
  )
}
