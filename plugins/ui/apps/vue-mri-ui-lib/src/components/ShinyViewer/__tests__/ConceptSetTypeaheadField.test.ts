import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createStore, Store } from 'vuex'
import ConceptSetTypeaheadField, { filterAndSort } from '../ConceptSetTypeaheadField.vue'
import domainService from '@/store/modules/domainService'
import i18n from '@/store/modules/i18n'

describe('ConceptSetTypeaheadField', () => {
  let store: Store<unknown>

  beforeEach(() => {
    store = createStore({
      modules: {
        domainService,
        i18n,
      },
    })
    vi.clearAllMocks()
  })

  const createComponent = (props = {}) => {
    return mount(ConceptSetTypeaheadField, {
      props: {
        fieldId: 'test_field',
        label: 'Test Field',
        configPath: 'condition_field_config',
        modelValue: null,
        ...props,
      },
      global: {
        stubs: ['Teleport'],
        plugins: [store],
      },
    })
  }

  it('generates attributePathUid with configPath and component UID', () => {
    const wrapper = createComponent()
    const attributePathUid = wrapper.vm.attributePathUid

    expect(attributePathUid).toContain('condition_field_config')
    expect(attributePathUid).toMatch(/condition_field_config__component_\d+/)
  })

  it('calls loadValuesForAttributePath with attributePathUid computed property', async () => {
    const mockData = [{ value: 'A001', text: 'A Option 1', display_value: 'A Option 1' }]

    store.dispatch = vi.fn().mockResolvedValue(mockData)

    const wrapper1 = createComponent()

    await wrapper1.vm.$nextTick()

    expect(store.dispatch).toHaveBeenCalledTimes(1)
    const callArgs = store.dispatch.mock.calls[0][1]

    expect(callArgs.attributePathUid).toBe(wrapper1.vm.attributePathUid)
    expect(callArgs.attributePathUid).toContain('condition_field_config')
    expect(callArgs.searchQuery).toBe('')
    expect(callArgs.attributeType).toBe('text')
  })
})

describe('filterAndSort', () => {
  it('should return all items when query is empty', () => {
    const items = [
      { label: 'Atrial Fibrillation', value: '313217' },
      { label: 'Diabetes Type 2', value: '44054006' },
    ]
    expect(filterAndSort(items, '')).toEqual(items)
  })

  describe('searching by value (concept code)', () => {
    const items = [
      { label: 'Atrial Fibrillation', value: '313217' },
      { label: 'Atrial Flutter', value: '313218' },
      { label: 'Chronic Atrial Fibrillation', value: '313217-C' },
      { label: 'Diabetes Type 2', value: '44054006' },
    ]

    it('should find items by exact value match even when label does not contain query', () => {
      // User searches "313217" - label "Atrial Fibrillation" doesn't contain it
      // but should still appear because value matches
      const result = filterAndSort(items, '313217')
      expect(result).toHaveLength(2)
      expect(result[0].value).toBe('313217') // Exact match first
      expect(result[1].value).toBe('313217-C') // Starts-with match
    })

    it('should prioritize exact value match over starts-with', () => {
      const result = filterAndSort(items, '313217')
      expect(result[0].value).toBe('313217')
      expect(result[1].value).toBe('313217-C')
    })

    it('should find items by partial value match', () => {
      const result = filterAndSort(items, '3132')
      expect(result).toHaveLength(3)
      expect(result.map(r => r.value)).toEqual(['313217', '313218', '313217-C'])
    })

    it('should not filter out items when query matches value but not label', () => {
      // This is the critical bug scenario
      const result = filterAndSort(items, '44054006')
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Diabetes Type 2')
      expect(result[0].value).toBe('44054006')
    })
  })

  describe('searching by label (display text)', () => {
    const items = [
      { label: 'Atrial Fibrillation', value: '313217' },
      { label: 'Atrial Flutter', value: '313218' },
      { label: 'Chronic Atrial Fibrillation', value: '313217-C' },
    ]

    it('should find items by label text', () => {
      const result = filterAndSort(items, 'atrial')
      expect(result).toHaveLength(3)
    })

    it('should prioritize exact label match', () => {
      const result = filterAndSort(items, 'Atrial Fibrillation')
      expect(result[0].label).toBe('Atrial Fibrillation')
    })

    it('should prioritize starts-with over contains', () => {
      const result = filterAndSort(items, 'atrial')
      // "Atrial Fibrillation" and "Atrial Flutter" start with "atrial"
      // "Chronic Atrial Fibrillation" contains "atrial" but doesn't start with it
      expect(result[2].label).toBe('Chronic Atrial Fibrillation')
    })
  })

  describe('case insensitivity', () => {
    const items = [
      { label: 'Atrial Fibrillation', value: '313217' },
      { label: 'DIABETES TYPE 2', value: '44054006' },
    ]

    it('should match regardless of query case', () => {
      expect(filterAndSort(items, 'ATRIAL')).toHaveLength(1)
      expect(filterAndSort(items, 'atrial')).toHaveLength(1)
      expect(filterAndSort(items, 'AtRiAl')).toHaveLength(1)
    })

    it('should match value codes regardless of case', () => {
      expect(filterAndSort(items, '313217')).toHaveLength(1)
      expect(filterAndSort(items, '44054006')).toHaveLength(1)
    })
  })
})
