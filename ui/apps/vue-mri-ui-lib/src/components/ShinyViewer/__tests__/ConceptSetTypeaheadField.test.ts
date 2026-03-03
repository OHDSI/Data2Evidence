import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createStore } from 'vuex'
import ConceptSetTypeaheadField from '../ConceptSetTypeaheadField.vue'
import domainService from '@/store/modules/domainService'
import i18n from '@/store/modules/i18n'

describe('ConceptSetTypeaheadField', () => {
  let store: any

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
