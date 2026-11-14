import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { buildVuetifyOptions } from '@ohdsi/atlas-ui'
import App from './App.vue'
import DataSourceCatalog from './views/DataSourceCatalog.vue'

const vuetify = createVuetify(buildVuetifyOptions())

describe('App (main-nav / catalog mount)', () => {
  it('passes the live getToken() result to DataSourceCatalog, not the (possibly stale) authContext.token', async () => {
    const getToken = vi.fn().mockResolvedValue('fresh-token')

    const wrapper = mount(App, {
      props: {
        name: 'datasource',
        authContext: { isAuthenticated: false, token: null },
        hostContext: undefined,
        getToken,
      },
      global: {
        plugins: [vuetify],
        stubs: { DataSourceCatalog: true },
      },
    })
    await flushPromises()

    expect(getToken).toHaveBeenCalled()
    const catalog = wrapper.findComponent(DataSourceCatalog)
    expect(catalog.props('token')).toBe('fresh-token')
  })

  it('opens a card on this plugin\'s source page', async () => {
    window.location.hash = ''

    const wrapper = mount(App, {
      props: {
        name: 'datasource',
        authContext: { isAuthenticated: false, token: null },
        hostContext: undefined,
      },
      global: {
        plugins: [vuetify],
        stubs: { DataSourceCatalog: true },
      },
    })
    await flushPromises()

    const catalog = wrapper.findComponent(DataSourceCatalog)
    catalog.props('onSelect')('7540953c-7c63-4746-ab47-9b111b2b0695')

    expect(window.location.hash).toBe('#/plugins/datasources/7540953c-7c63-4746-ab47-9b111b2b0695')
  })

  it('renders the source page when the hash is #/plugins/datasources/<key>', async () => {
    window.location.hash = '#/plugins/datasources/7540953c'

    const wrapper = mount(App, {
      props: {
        name: 'datasource',
        authContext: { isAuthenticated: false, token: null },
        hostContext: undefined,
      },
      global: {
        plugins: [vuetify],
        stubs: { DataSourceCatalog: true, DataSourcePage: true },
      },
    })
    await flushPromises()

    expect(wrapper.findComponent(DataSourceCatalog).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'DataSourcePage' }).props('sourceKey')).toBe('7540953c')
    window.location.hash = ''
  })

  it('returns to the catalog when Atlas3 navigates with pushState (popstate, no hashchange)', async () => {
    window.location.hash = '#/plugins/datasources/7540953c'

    const wrapper = mount(App, {
      props: {
        name: 'datasource',
        authContext: { isAuthenticated: false, token: null },
        hostContext: undefined,
      },
      global: {
        plugins: [vuetify],
        stubs: { DataSourceCatalog: true, DataSourcePage: true },
      },
    })
    await flushPromises()

    history.pushState(null, '', '#/plugins/datasources/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await flushPromises()

    expect(wrapper.findComponent(DataSourceCatalog).exists()).toBe(true)
    wrapper.unmount()
    window.location.hash = ''
  })

  it('scrolls to the top when switching between the catalog and a source page', async () => {
    window.location.hash = ''
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    const wrapper = mount(App, {
      props: {
        name: 'datasource',
        authContext: { isAuthenticated: false, token: null },
        hostContext: undefined,
      },
      global: {
        plugins: [vuetify],
        stubs: { DataSourceCatalog: true, DataSourcePage: true },
      },
    })
    await flushPromises()

    history.pushState(null, '', '#/plugins/datasources/7540953c')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await flushPromises()

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    wrapper.unmount()
    scrollTo.mockRestore()
    window.location.hash = ''
  })

  it('waits for getToken() before rendering a source page, so it loads once with the fresh token', async () => {
    window.location.hash = '#/plugins/datasources/7540953c'
    let resolveToken: (t: string) => void = () => {}
    const getToken = vi.fn(() => new Promise<string>(r => { resolveToken = r }))

    const wrapper = mount(App, {
      props: {
        name: 'datasource',
        authContext: { isAuthenticated: true, token: 'stale-token' },
        hostContext: undefined,
        getToken,
      },
      global: {
        plugins: [vuetify],
        stubs: { DataSourceCatalog: true, DataSourcePage: true },
      },
    })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'DataSourcePage' }).exists()).toBe(false)
    expect(wrapper.findComponent(DataSourceCatalog).exists()).toBe(false)

    resolveToken('fresh-token')
    await flushPromises()
    expect(wrapper.findComponent({ name: 'DataSourcePage' }).props('token')).toBe('fresh-token')
    wrapper.unmount()
    window.location.hash = ''
  })
})
