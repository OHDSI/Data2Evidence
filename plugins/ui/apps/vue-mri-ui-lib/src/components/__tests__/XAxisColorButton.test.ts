import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { describe, expect, it } from 'vitest'
import XAxisColorButton from '../XAxisColorButton.vue'

const genderAttribute = {
  sConfigPath: 'patient.attributes.gender',
  oInternalConfigAttribute: { name: 'Gender' },
}

const buildStore = (axes: any[]) =>
  createStore({
    state: { axes },
    getters: {
      getAllAxes: (state: any) => state.axes,
      getMriFrontendConfig: () => ({
        getFilterCardByInstanceId: (instanceId: string) =>
          instanceId === 'patient'
            ? {
                aAllAttributes: [genderAttribute],
                oInternalConfigFilterCard: { name: 'Basic Data' },
              }
            : undefined,
      }),
      getChartableFilterCards: () => [],
      getText: () => (key: string) => key,
    },
  })

const mountButton = (axes: any[], selectedAxis: number | null = null) => {
  const store = buildStore(axes)
  const wrapper = shallowMount(XAxisColorButton as any, {
    props: { parentContainer: null, selectedAxis },
    global: { plugins: [store], stubs: { dropDownMenu: true } },
  })
  return Object.assign(wrapper, { store })
}

const chartableAxis = { props: { filterCardId: 'patient', key: 'gender', attributeId: 'patient.attributes.gender' } }

describe('XAxisColorButton store reconciliation', () => {
  it('rejects a color axis it cannot offer instead of holding it silently', async () => {
    // Both x axis slots are empty, so the menu has no item for index 0.
    const wrapper = mountButton([{ props: {} }, { props: {} }])

    await wrapper.setProps({ selectedAxis: 0 })

    expect(wrapper.emitted('colorAxisSelected')).toEqual([[null]])
    expect(wrapper.text()).toContain('MRI_PA_SELECT_X_AXIS')
  })

  it('adopts a color axis that maps to a selectable attribute', async () => {
    const wrapper = mountButton([chartableAxis, { props: {} }])

    await wrapper.setProps({ selectedAxis: 0 })

    expect(wrapper.emitted('colorAxisSelected')).toBeUndefined()
    expect(wrapper.text()).toContain('Gender')
  })

  it('adopts a selection the store already holds when mounted into a loaded cohort', () => {
    const wrapper = mountButton([chartableAxis, { props: {} }], 0)

    expect(wrapper.emitted('colorAxisSelected')).toBeUndefined()
    expect(wrapper.text()).toContain('Gender')
  })

  it('clears the selection when its axis is repointed at another attribute', async () => {
    const wrapper = mountButton([{ ...chartableAxis }, { props: {} }], 0)

    expect(wrapper.text()).toContain('Gender')

    wrapper.store.state.axes = [
      { props: { filterCardId: 'patient', key: 'condition', attributeId: 'patient.attributes.condition' } },
      { props: {} },
    ]
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('colorAxisSelected')).toEqual([[null]])
    expect(wrapper.text()).toContain('MRI_PA_SELECT_X_AXIS')
  })
})
