import { h, createApp } from 'vue'
import singleSpaVue from 'single-spa-vue'
import { createVuetify } from 'vuetify'
import { buildVuetifyOptions } from '@ohdsi/atlas-ui'
import '@ohdsi/atlas-ui/style.css'
import App from './App.vue'

export interface PluginProps {
  name: string
  mountParcel: unknown
  singleSpa: unknown
  authContext: {
    user?: { id: number; username: string; permissions: string[] }
    token: string | null
    isAuthenticated: boolean
    hasPermission: (permission: string) => boolean
  }
  messageBus: {
    send: (type: string, payload: unknown) => void
    request: <T>(type: string, payload: unknown) => Promise<T>
    subscribe: (type: string, callback: (data: unknown) => void) => () => void
  }
  hostContext?: {
    surface: string
    itemId: string
    locale: string
    permissions: string[]
    sourceKey?: string
  }
}

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App, {
        name: (this as PluginProps).name,
        authContext: (this as PluginProps).authContext,
        messageBus: (this as PluginProps).messageBus,
        hostContext: (this as PluginProps).hostContext,
      })
    },
  },
  handleInstance(app, props) {
    app.use(createVuetify(buildVuetifyOptions()))
    app.provide('pluginProps', props)
  },
})

export const bootstrap = vueLifecycles.bootstrap
export const mount = vueLifecycles.mount
export const unmount = vueLifecycles.unmount
export const update = vueLifecycles.update
