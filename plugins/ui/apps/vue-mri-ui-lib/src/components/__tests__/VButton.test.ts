import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import VButton from '@/components/vuetify/VButton.vue'

const vuetify = createVuetify({ components, directives })

function mountVButton(props = {}, slots = {}) {
  return mount(VButton, {
    global: { plugins: [vuetify] },
    props,
    slots,
  })
}

describe('VButton', () => {
  it('renders text from the text prop', () => {
    const wrapper = mountVButton({ text: 'Save' })
    expect(wrapper.text()).toContain('Save')
  })

  it('renders slot content over the text prop', () => {
    const wrapper = mountVButton({ text: 'ignored' }, { default: 'Slot label' })
    expect(wrapper.text()).toContain('Slot label')
  })

  it('renders a disabled button when disabled prop is true', () => {
    const wrapper = mountVButton({ disabled: true })
    const btn = wrapper.find('button')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('emits click events when not disabled', async () => {
    const wrapper = mountVButton({ text: 'Click me' })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mountVButton({ disabled: true })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('passes variant through to the rendered v-btn class', () => {
    const wrapper2 = mount(VButton, {
      global: { plugins: [vuetify] },
      attrs: { variant: 'outlined' },
    })
    expect(wrapper2.find('.v-btn--variant-outlined').exists()).toBe(true)
  })

  it('applies block class when block prop is set', () => {
    const wrapper = mount(VButton, {
      global: { plugins: [vuetify] },
      attrs: { block: true },
    })
    expect(wrapper.find('.v-btn--block').exists()).toBe(true)
  })

  it('renders prepend slot content', () => {
    const wrapper = mount(VButton, {
      global: { plugins: [vuetify] },
      slots: { prepend: '<span data-testid="icon">★</span>', default: 'Label' },
    })
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Label')
  })
})
