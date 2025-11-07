import { shallowMount } from '@vue/test-utils'
import appIcon from '../app-icon.vue'

describe('app-icon.vue', () => {
  it('renders span', () => {
    const icon = 'close'
    const wrapper = shallowMount(appIcon as any, {
      propsData: { icon },
    })
    expect(wrapper.findAll('span')).toHaveLength(1)
    expect(wrapper.element.className).toEqual('app-icon')
  })
})
