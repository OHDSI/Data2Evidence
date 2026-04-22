// Must be first import to set up sap mock before any component uses it
import './globals'
import { createApp, Component } from 'vue'
import Multiselect from 'vue-multiselect'
import { applyPolyfills, defineCustomElements } from '@d4l/web-components-library/dist/loader'
import vuetify from './plugins/vuetify'

import App from './App.vue'
import RootLayout from './RootLayout.vue'
import clickFocus from './directives/clickFocus'
import focus from './directives/focus'
import mouseScroll from './directives/mouseScroll'
import positionCenter from './directives/positionCenter'
import resizeTable from './directives/resizeTable'
import appButtonVue from './lib/ui/app-button.vue'
import appDateRangeVue from './lib/ui/app-date-range.vue'
import appDatetimeRangeVue from './lib/ui/app-datetime-range.vue'
import appLabelVue from './lib/ui/app-label.vue'
import appRangeVue from './lib/ui/app-range.vue'
import appVariantRangeVue from './lib/ui/app-variant-range.vue'
import appSingleSelect from './lib/ui/app-single-select.vue'
import appTagInputVue from './lib/ui/app-tag-input.vue'
import { createPinia } from 'pinia'
import store from './store'
import { getPortalAPI } from './utils/PortalUtils'
import { initializeApps } from './utils/AppRegistry'
import { initializeComponents } from './utils/ComponentRegistry'
import { applyTheme } from './utils/ThemeManager'
import { createPortalContextStore } from './stores/portalContext'
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
app.use(store)
app.use(pinia)

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
app.component('app-label', appLabelVue)
app.component('app-tag-input', appTagInputVue)
app.component('app-range', appRangeVue)
app.component('app-variant-range', appVariantRangeVue)
app.component('app-button', appButtonVue)
app.component('app-date-range', appDateRangeVue as any)
app.component('app-datetime-range', appDatetimeRangeVue as any)
app.component('app-single-select', appSingleSelect)
app.component('multiselect', Multiselect)
app.directive('focus', focus)
app.directive('click-focus', clickFocus)
app.directive('position-center', positionCenter)
app.directive('mouse-scroll', mouseScroll)
app.directive('resize-table', resizeTable)

// Suppress errors and warnings in production unless VITE_DEBUG is enabled
if (import.meta.env.VITE_DEBUG !== 'true') {
  app.config.errorHandler = () => null
  app.config.warnHandler = () => null
}

// Bind the custom elements to the window object
applyPolyfills().then(() => {
  defineCustomElements()
})

app.mount('.vue-main')
