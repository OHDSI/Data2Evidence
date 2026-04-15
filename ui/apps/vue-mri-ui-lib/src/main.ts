// Must be first import to set up sap mock before any component uses it
import './globals'
import { createApp } from 'vue'
import Multiselect from 'vue-multiselect'
import { applyPolyfills, defineCustomElements } from '@d4l/web-components-library/dist/loader'
import vuetify from './plugins/vuetify'

import AppRoot from './App.vue'
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
import { SET_ACTIVE_BOOKMARK } from './store/mutation-types'
import { getPortalAPI } from './utils/PortalUtils'
import { initializeApps } from './utils/AppRegistry'
import { initializeComponents } from './utils/ComponentRegistry'
import { applyTheme } from './utils/ThemeManager'

import './styles/themes/_main.scss'

let app: ReturnType<typeof createApp> | null = null

const createPAApp = () => {
  const portalAPI = getPortalAPI()

  const isLocal = 'isLocal' in portalAPI && portalAPI.isLocal === true
  const paApp = createApp(isLocal ? RootLayout : AppRoot)

  if (isLocal) {
    applyTheme('atlas')

    // For local development, uncomment to use D2E theme
    // applyTheme('d2e')

    // Initialize registries
    initializeApps()
    initializeComponents()
  } else {
    applyTheme('d2e')
  }

  const pinia = createPinia()
  paApp.use(store)
  paApp.use(pinia)
  paApp.use(vuetify)
  paApp.component('app-label', appLabelVue)
  paApp.component('app-tag-input', appTagInputVue)
  paApp.component('app-range', appRangeVue)
  paApp.component('app-variant-range', appVariantRangeVue)
  paApp.component('app-button', appButtonVue)
  paApp.component('app-date-range', appDateRangeVue as any)
  paApp.component('app-datetime-range', appDatetimeRangeVue as any)
  paApp.component('app-single-select', appSingleSelect)
  paApp.component('multiselect', Multiselect)
  paApp.directive('focus', focus)
  paApp.directive('click-focus', clickFocus)
  paApp.directive('position-center', positionCenter)
  paApp.directive('mouse-scroll', mouseScroll)
  paApp.directive('resize-table', resizeTable)

  // Suppress errors and warnings in production unless VITE_DEBUG is enabled
  if (import.meta.env.VITE_DEBUG !== 'true') {
    paApp.config.errorHandler = () => null
    paApp.config.warnHandler = () => null
  }

  return paApp
}

const mountPA = () => {
  if (app) {
    app.unmount()
    app = null
  }

  app = createPAApp()
  app.mount('.vue-main')
}

const unmountPA = () => {
  if (!app) return
  app.unmount()
  store.commit(SET_ACTIVE_BOOKMARK, null)
  app = null
}

// Bind the custom elements to the window object
applyPolyfills().then(() => {
  defineCustomElements()
})

window.mountPA = mountPA
window.unmountPA = unmountPA

if (import.meta.env.DEV) {
  mountPA()
}
