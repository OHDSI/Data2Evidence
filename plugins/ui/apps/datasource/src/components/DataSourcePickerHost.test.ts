import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createVuetify } from 'vuetify'
import { buildVuetifyOptions } from '@ohdsi/atlas-ui'
import DataSourcePickerHost from './DataSourcePickerHost.vue'
import type { DatasourceCardVM } from '../composables/useDatasourceCatalog'

const sources = ref<DatasourceCardVM[]>([])
const loading = ref(true)

vi.mock('../composables/useDatasourceOptions', () => ({
  useDatasourceOptions: () => ({ sources, loading, reload: vi.fn() }),
}))

const vuetify = createVuetify(buildVuetifyOptions())

const source = (id: string, access: DatasourceCardVM['access']): DatasourceCardVM => ({
  id,
  name: id,
  description: '',
  subjectCount: '',
  publishedDate: '',
  sourceType: '',
  version: '',
  isPublic: false,
  access,
})

function mountHost(currentKey: string) {
  const onSelect = vi.fn()
  const onUnavailable = vi.fn()
  const onFallback = vi.fn()
  mount(DataSourcePickerHost, {
    props: { currentKey, token: 't', onSelect, onUnavailable, onFallback },
    global: { plugins: [vuetify] },
  })
  return { onUnavailable, onFallback }
}

describe('DataSourcePickerHost', () => {
  beforeEach(() => {
    sources.value = []
    loading.value = true
  })

  it('does nothing while the list is loading', async () => {
    const { onFallback, onUnavailable } = mountHost('a')
    await flushPromises()
    expect(onFallback).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()
  })

  it('falls back when the list comes back empty', async () => {
    const { onFallback } = mountHost('a')
    loading.value = false
    await flushPromises()
    expect(onFallback).toHaveBeenCalled()
  })

  it('falls back when the list does not include the current source', async () => {
    const { onFallback } = mountHost('a')
    sources.value = [source('b', 'approved')]
    loading.value = false
    await flushPromises()
    expect(onFallback).toHaveBeenCalled()
  })

  it('keeps the d2e picker for an accessible current source', async () => {
    const { onFallback, onUnavailable } = mountHost('a')
    sources.value = [source('a', 'approved'), source('b', 'no-access')]
    loading.value = false
    await flushPromises()
    expect(onFallback).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()
  })

  it('reports a current source the user cannot access', async () => {
    const { onUnavailable, onFallback } = mountHost('b')
    sources.value = [source('a', 'approved'), source('b', 'no-access')]
    loading.value = false
    await flushPromises()
    expect(onUnavailable).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }))
    expect(onFallback).not.toHaveBeenCalled()
  })
})
