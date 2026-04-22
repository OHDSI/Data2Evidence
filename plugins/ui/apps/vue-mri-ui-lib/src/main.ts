// Must be first import to set up sap mock before any component uses it
import './globals'
import { createApp, Component } from 'vue'
import vuetify from './plugins/vuetify'

import App from './App.vue'
import RootLayout from './RootLayout.vue'
import { createPinia } from 'pinia'
import { createStore } from './store'
import { initializeApps } from './utils/AppRegistry'
import { initializeComponents } from './utils/ComponentRegistry'
import { applyTheme } from './utils/ThemeManager'
import { createPortalContextStore } from './stores/portalContext'
import { initGlobalsOnce, registerDirectivesAndComponents } from './bootstrap/registerGlobals'
import type { PortalContextState } from './types/portal-props'

let app: Component
const isLocal = window.location.hostname === 'localhost'
const searchParams = new URLSearchParams(window.location.search)
import './styles/themes/_main.scss'

if (isLocal) {
  app = createApp(RootLayout as unknown as Component)
  applyTheme('atlas')

  // For local development, uncomment to use D2E theme
  // applyTheme('d2e')

  // Initialize registries
  initializeApps()
  initializeComponents()
} else {
  app = createApp(App as unknown as Component)
  applyTheme('d2e')
}

const pinia = createPinia()
app.use(pinia)
app.use(createStore())

const portalContext: PortalContextState = {
  getToken: async () => localStorage.getItem('msaltoken') || '',
  datasetId: searchParams.get('datasetId') || 'dev-dataset',
  releaseId: searchParams.get('releaseId') || 'dev-release',
  tenantId: 'dev-tenant',
  username: 'dev-user',
  idpUserId: 'dev-idp',
  locale: 'en',
  features: [],
  featuresLoading: false,
  qeSvcUrl: import.meta.env.VITE_API_BASE_URL,
  REACT_APP_PUBLIC_WEBAPI_PROXY_URL: undefined,
  REACT_APP_USE_PUBLIC_WEBAPI_PROXY: undefined,
  REACT_APP_PUBLIC_WEBAPI_DATASOURCE: undefined,
  debug: import.meta.env.DEV,
}
createPortalContextStore(portalContext, pinia)

app.use(vuetify)
registerDirectivesAndComponents(app as any)

// Suppress errors and warnings in production unless VITE_DEBUG is enabled
if (import.meta.env.VITE_DEBUG !== 'true') {
  app.config.errorHandler = () => null
  app.config.warnHandler = () => null
}

initGlobalsOnce()

app.mount('.vue-main')
