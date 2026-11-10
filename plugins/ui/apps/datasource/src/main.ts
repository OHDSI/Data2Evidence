import { h, createApp, reactive } from 'vue'
import singleSpaVue from 'single-spa-vue'
import { createVuetify } from 'vuetify'
import { buildVuetifyOptions } from '@ohdsi/atlas-ui'
import '@ohdsi/atlas-ui/style.css'
import '@d2e/ui/tokens.css'
import './styles/style.css'
import App from './App.vue'
import DataSourcePickerHost from './components/DataSourcePickerHost.vue'
import type { DataSourceCardVM } from './composables/useDataSourceCatalog'
import { DESCRIPTION_REPORT, pluginSourceHash, sourceTargetHash } from './utils/routes'

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
  getToken?: () => Promise<string>
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
        getToken: (this as PluginProps).getToken,
      })
    },
  },
  handleInstance(app, props) {
    app.use(createVuetify({ ...buildVuetifyOptions(), theme: false as never }))
    app.provide('pluginProps', props)
  },
})

export { DESCRIPTION_REPORT, pluginSourceHash }

export interface PickerOptions {
  currentKey: string | null
  getToken: () => string | null
  onFallback?: () => void
}

export interface PickerHandle {
  update: (currentKey: string | null) => void
  unmount: () => void
}

export function mountPicker(el: Element, opts: PickerOptions): PickerHandle {
  const state = reactive({ currentKey: opts.currentKey, token: opts.getToken() })
  const app = createApp({
    render: () =>
      h(DataSourcePickerHost, {
        currentKey: state.currentKey,
        token: state.token,
        onSelect: (source: DataSourceCardVM) => {
          window.location.hash = sourceTargetHash(source.id, source.access, window.location.hash)
        },
        onUnavailable: (source: DataSourceCardVM) => window.location.replace(pluginSourceHash(source.id)),
        onFallback: opts.onFallback,
      }),
  })
  app.use(createVuetify({ ...buildVuetifyOptions(), theme: false as never }))
  app.mount(el)
  return {
    update(currentKey) {
      state.currentKey = currentKey
      state.token = opts.getToken()
    },
    unmount: () => app.unmount(),
  }
}

type MountProps = PluginProps & { domElement?: HTMLElement | null; containerId?: string }

async function withDomElement(props: MountProps): Promise<MountProps> {
  if (props.domElement || !props.containerId) return props
  for (let i = 0; i < 100; i++) {
    const el = document.getElementById(props.containerId)
    if (el) return { ...props, domElement: el }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  console.warn(`[datasource] #${props.containerId} not found; mounting without it`)
  return props
}

export const bootstrap = vueLifecycles.bootstrap
export const mount = async (props: MountProps) => vueLifecycles.mount(await withDomElement(props))
export const unmount = vueLifecycles.unmount
export const update = vueLifecycles.update
