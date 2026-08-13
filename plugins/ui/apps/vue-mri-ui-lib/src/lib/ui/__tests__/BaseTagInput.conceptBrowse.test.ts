import { mount } from '@vue/test-utils'
import BaseTagInput from '../BaseTagInput.vue'

const mountTagInput = (props: Record<string, unknown> = {}) =>
  mount(BaseTagInput, {
    props: {
      value: [],
      componentType: 'text',
      ...props,
    },
    global: {
      stubs: {
        multiselect: true,
        appIcon: true,
      },
    },
  })

describe('BaseTagInput concept browsing', () => {
  it('offers no browse button for a plain text attribute', () => {
    const wrapper = mountTagInput({ conceptSetConfig: {} })

    expect(wrapper.vm.canBrowseConcepts).toBe(false)
    expect(wrapper.find('d4l-button').exists()).toBe(false)
  })

  it('offers a browse button for a text attribute that stores a concept identifier', () => {
    const wrapper = mountTagInput({ conceptSetConfig: { conceptIdentifierType: 'id' } })

    expect(wrapper.vm.canBrowseConcepts).toBe(true)
    expect(wrapper.find('d4l-button').exists()).toBe(true)
  })

  it('leaves the concept set flow untouched', () => {
    const wrapper = mountTagInput({
      componentType: 'conceptSet',
      conceptSetConfig: { conceptIdentifierType: 'id' },
    })

    // conceptSet keeps its own "create concept set" button, not the browse one
    expect(wrapper.vm.canBrowseConcepts).toBe(false)
    expect(wrapper.find('d4l-button').exists()).toBe(true)
  })

  it('emits a browse action carrying the attribute config', async () => {
    const conceptSetConfig = { conceptIdentifierType: 'code', domainFilter: 'Condition' }
    const wrapper = mountTagInput({ conceptSetConfig })

    wrapper.vm.handleBrowseConcepts()

    const emitted = wrapper.emitted('concept-set-action')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual({
      values: null,
      config: conceptSetConfig,
      componentType: 'text',
      action: 'browse',
    })
  })
})
