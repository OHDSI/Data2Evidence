import { shallowMount } from '@vue/test-utils'
import filtercard from '../FilterCard.vue'

describe.skip('FilterCard.vue.vue', () => {
  it('renders a div', () => {
    const wrapper = shallowMount(filtercard as any)
    expect(wrapper.findAll('div')).toHaveLength(1)
    expect(wrapper.element.className).toEqual('FilterCard')
  })
})
