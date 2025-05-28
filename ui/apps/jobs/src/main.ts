import './assets/main.css'
import '@prefecthq/graphs/dist/style.css'
import 'highlight.js/styles/monokai.css'
import '@prefecthq/prefect-design/dist/style.css'
import '@prefecthq/prefect-ui-library/dist/style.css'
import '@d4l/web-components-library/dist/d4l-ui/d4l-ui.css'
import { applyPolyfills, defineCustomElements } from '@d4l/web-components-library/dist/loader'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { plugin as PrefectDesign } from '@prefecthq/prefect-design'
import { plugin as PrefectUILibrary } from '@prefecthq/prefect-ui-library'
import App from './App.vue'
import router from '@/router'
import { initColorMode } from './utils/colorMode'

initColorMode()

const mountJobs = (addEventListener: boolean = true) => {
  try {
    const app = createApp(App)

    app.config.errorHandler = (err, vm, info) => {
      console.error('Error:', err, '\nInfo:', info, '\nComponent:', vm)
    }
    app.config.warnHandler = (msg, vm, trace) => {
      console.warn('Warning:', msg, '\nTrace:', trace, '\nComponent:', vm)
    }
    app.config.compilerOptions.isCustomElement = (tag: string) => tag.startsWith('d4l-')
    applyPolyfills().then(() => {
      defineCustomElements()
    })

    app.use(createPinia())
    app.use(router)
    app.use(PrefectDesign)
    app.use(PrefectUILibrary)
    app.mount('#jobs-main')

    if (addEventListener) {
      window.addEventListener('unmount-jobs', () => {
        app.unmount()
      })
    }
  } catch (err) {
    console.log(err)
  }
}

// app mounting function is used so it can be triggered from global context
// This is required as ESM module that is build will not reload using <script> tags
// like we do for cohorts vue app.

// @ts-ignore
window.mountJobs = mountJobs

if (process.env.NODE_ENV === 'development') {
  console.log('Jobs is running in development mode')
  mountJobs(false)
} else {
  console.log('Jobs is running in production mode')
}
