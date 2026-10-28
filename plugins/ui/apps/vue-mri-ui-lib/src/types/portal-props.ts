export interface Feature {
  feature: string
  isEnabled: boolean
}

export interface PortalContextState {
  getToken: () => Promise<string>
  datasetId: string
  releaseId: string
  username: string
  /**
   * Whether `username` is still being fetched.
   *
   * `username` is an OWNERSHIP KEY, so an empty one is not a safe default:
   * every ownership test compares it to a bookmark's `user_id`, and "" matches
   * nobody, which renders a user's own saved work as absent rather than as
   * pending. The flag is what lets a consumer tell the two apart.
   */
  usernameLoading: boolean
  locale: string
  features: Feature[]
  featuresLoading: boolean
  qeSvcUrl?: string
  /**
   * The plugin's own public directory in the Atlas3 shell, e.g.
   * `/atlas/plugins/patient-analytics/`. Atlas sends it; the D2E portal does
   * not, so it is how another Atlas plugin's bundle is located from here.
   */
  uiFilesUrl?: string
  REACT_APP_PUBLIC_WEBAPI_PROXY_URL?: string
  REACT_APP_USE_PUBLIC_WEBAPI_PROXY?: string
  REACT_APP_PUBLIC_WEBAPI_DATASOURCE?: string
  debug?: boolean
}

declare global {
  interface Window {
    __MRI_PORTAL_CONTEXT__?: Partial<PortalContextState> & {
      datasource?: string
    }
  }
}
