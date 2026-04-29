/// <reference types="vite/client" />

declare global {
  interface Window {
    System: System
    importMapOverrides?: {
      getOverrideMap: () => { imports: Record<string, string>; scopes: Record<string, any> }
    }
  }
}

interface ImportMetaEnv {
  readonly VITE_HOST?: string
  readonly VITE_PATH?: string
  readonly VITE_NAVIGATION_ITEMS?: string
  readonly VITE_STANDALONE_ATLAS?: string
  readonly VITE_CLIENT_ID?: string
  readonly VITE_DATASET_ID?: string
  readonly VITE_DEBUG?: string
  readonly VITE_FEATURES?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_REDIRECT_URL?: string
  readonly VITE_AUTHORITY?: string
  readonly VITE_ISSUER?: string
  readonly VITE_AUTH_ENDPOINT?: string
  readonly VITE_TOKEN_ENDPOINT?: string
  readonly VITE_END_SESSION_ENDPOINT?: string
  readonly VITE_REVOCATION_ENDPOINT?: string
  readonly VITE_QE_SVC_URL?: string
  readonly VITE_USERNAME?: string
  readonly VITE_LOCALE?: string
  readonly VITE_DEFAULT_DATASOURCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}
