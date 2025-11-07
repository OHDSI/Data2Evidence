import '../../globals'
import ui5adaptor from '@/components/UI5Adaptor.vue'
import { shallowMount } from '@vue/test-utils'

// TODO: need to setup store of vue component
xdescribe('UI5Adaptor.vue', () => {
  it('renders a messageBox when home is clicked', () => {
    const wrapper = shallowMount(ui5adaptor as any)
    expect(wrapper.findAll('div')).toHaveLength(1)
  })
})
