import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createStore } from 'vuex'
import BuilderDataSourceLabel from '../BuilderDataSourceLabel.vue'

// The label reads VITE_ATLAS_HOSTED when its module loads, so stub it before the import above.
vi.hoisted(() => {
  vi.stubEnv('VITE_ATLAS_HOSTED', 'true')
})

const LONG_NAME = 'A data source name long enough to be cut off with an ellipsis in the builder toolbar'

vi.mock('@d2e/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@d2e/ui')>()),
  isTruncated: () => true,
}))

vi.mock('../../composables/usePortalContext', () => ({
  usePortalContext: () => ({ datasetId: 'ds-1' }),
}))

const vuetify = createVuetify({ components, directives })

const createTestStore = () =>
  createStore({
    getters: {
      getText: () => (key: string) => key,
      getSelectedDatasetName: () => LONG_NAME,
      getSelectedDataset: () => ({ id: 'ds-1' }),
      getDataSources: () => [{ id: 'ds-1', name: LONG_NAME }],
    },
    actions: { fireGetDataSources: vi.fn() },
  })

const mountLabel = async () => {
  const wrapper = mount(BuilderDataSourceLabel, {
    attachTo: document.body,
    global: { plugins: [vuetify, createTestStore()] },
  })
  await flushPromises()
  return wrapper
}

const queryTooltip = (): HTMLElement | null =>
  Array.from(document.querySelectorAll<HTMLElement>('.v-overlay__content')).find(el =>
    el.textContent?.includes(LONG_NAME)
  ) ?? null

describe('BuilderDataSourceLabel', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('shows the truncated name in the d2e-styled tooltip on keyboard focus', async () => {
    const wrapper = await mountLabel()
    const name = wrapper.get<HTMLElement>('[data-testid="builder-datasource-name"]')
    expect(name.attributes('tabindex')).toBe('0')

    name.element.focus()
    await vi.waitFor(() => expect(queryTooltip()).not.toBeNull())

    expect(queryTooltip()?.classList.contains('d2e-tooltip')).toBe(true)
    wrapper.unmount()
  })
})
