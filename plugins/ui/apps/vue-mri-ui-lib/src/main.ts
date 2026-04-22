// Must be first import to set up sap mock before any component uses it
import './globals'
import { createApp, Component } from 'vue'
import vuetify from './plugins/vuetify'

import App from './App.vue'
import RootLayout from './RootLayout.vue'
import { createPinia } from 'pinia'
import { createStore } from './store'
import { getPortalAPI } from './utils/PortalUtils'
import { initializeApps } from './utils/AppRegistry'
import { initializeComponents } from './utils/ComponentRegistry'
import { applyTheme } from './utils/ThemeManager'
import { createPortalContextStore } from './stores/portalContext'
import { initGlobalsOnce, registerDirectivesAndComponents } from './bootstrap/registerGlobals'
import type { PortalContextState } from './types/portal-props'

let app: Component
const portalAPI = getPortalAPI()
const isLocal = portalAPI?.isLocal === true
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
  getToken: portalAPI?.getToken || (async () => localStorage.getItem('msaltoken') || ''),
  datasetId: portalAPI?.studyId || 'dev-dataset',
  releaseId: portalAPI?.releaseId || 'dev-release',
  tenantId: 'dev-tenant',
  username: portalAPI?.username || 'dev-user',
  idpUserId: 'dev-idp',
  locale: portalAPI?.locale || 'en',
  features: portalAPI?.features || [],
  featuresLoading: portalAPI?.featuresLoading ?? false,
  qeSvcUrl: portalAPI?.qeSvcUrl,
  REACT_APP_PUBLIC_WEBAPI_PROXY_URL: portalAPI?.REACT_APP_PUBLIC_WEBAPI_PROXY_URL,
  REACT_APP_USE_PUBLIC_WEBAPI_PROXY: portalAPI?.REACT_APP_USE_PUBLIC_WEBAPI_PROXY,
  REACT_APP_PUBLIC_WEBAPI_DATASOURCE: portalAPI?.REACT_APP_PUBLIC_WEBAPI_DATASOURCE,
  debug: portalAPI?.debug,
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
