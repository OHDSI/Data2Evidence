import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { buildVuetifyOptions } from '@ohdsi/atlas-ui'
import App from './App.vue'
import DatasourceCatalog from './views/DatasourceCatalog.vue'

const vuetify = createVuetify(buildVuetifyOptions())

describe('App (main-nav / catalog mount)', () => {
  it('passes the live getToken() result to DatasourceCatalog, not the (possibly stale) authContext.token', async () => {
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
        stubs: { DatasourceCatalog: true },
      },
    })
    await flushPromises()

    expect(getToken).toHaveBeenCalled()
    const catalog = wrapper.findComponent(DatasourceCatalog)
    expect(catalog.props('token')).toBe('fresh-token')
  })

  it('navigates a card click straight to this plugin\'s Description mount for that source', async () => {
    window.location.hash = ''

    const wrapper = mount(App, {
      props: {
        name: 'datasource',
        authContext: { isAuthenticated: false, token: null },
        hostContext: undefined,
      },
      global: {
        plugins: [vuetify],
        stubs: { DatasourceCatalog: true },
      },
    })
    await flushPromises()

    const catalog = wrapper.findComponent(DatasourceCatalog)
    catalog.props('onSelect')('7540953c-7c63-4746-ab47-9b111b2b0695')

    expect(window.location.hash).toBe(
      '#/datasources/7540953c-7c63-4746-ab47-9b111b2b0695/plugin:datasources:datasource',
    )
  })
})
