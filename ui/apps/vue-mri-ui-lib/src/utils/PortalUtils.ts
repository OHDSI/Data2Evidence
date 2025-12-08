interface Feature {
  feature: string
  isEnabled: boolean
}

export const getPortalAPI = (): {
  getToken
  qeSvcUrl?: string
  studyId?: string
  releaseId?: string
  username?: string
  features?: Feature[]
  featuresLoading?: boolean
  locale?: string
  isLocal?: boolean
  debug?: boolean
  REACT_APP_PUBLIC_WEBAPI_PROXY_URL?: string
  REACT_APP_USE_PUBLIC_WEBAPI_PROXY?: string
  REACT_APP_PUBLIC_WEBAPI_DATASOURCE?: string
  toggleAtlas?(val: boolean, path: string): void
} => {
  if (document.getElementsByClassName('plugin-container').length === 1) {
    return (document.getElementsByClassName('plugin-container')[0] as any).portalAPI
  }
  return null
}
