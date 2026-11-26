import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataSourceBanner from './DataSourceBanner.vue'

const pending = (w: ReturnType<typeof mount>) => w.get('[data-testid="ds-banner"]').classes('ds-banner--pending')

describe('DataSourceBanner', () => {
  it('keeps the banner hidden until the config and logo are loaded', async () => {
    const wrapper = mount(DataSourceBanner, { props: {} })
    expect(pending(wrapper)).toBe(true)
    expect(wrapper.find('[data-testid="ds-banner-logo"]').exists()).toBe(false)

    await wrapper.setProps({ title: 'Data2Evidence', description: 'Full tagline', logoUrl: '/logo-a.svg' })
    expect(pending(wrapper)).toBe(true)

    await wrapper.get('[data-testid="ds-banner-logo"]').trigger('load')
    expect(pending(wrapper)).toBe(false)
  })

  it('shows a previously loaded logo immediately on remount', () => {
    const wrapper = mount(DataSourceBanner, {
      props: { title: 'Data2Evidence', description: 'Full tagline', logoUrl: '/logo-a.svg' },
    })
    expect(pending(wrapper)).toBe(false)
  })

  it('reveals the banner when the logo fails to load', async () => {
    const wrapper = mount(DataSourceBanner, {
      props: { title: 'Data2Evidence', description: 'Full tagline', logoUrl: '/logo-broken.svg' },
    })
    expect(pending(wrapper)).toBe(true)
    await wrapper.get('[data-testid="ds-banner-logo"]').trigger('error')
    expect(pending(wrapper)).toBe(false)
  })
})
