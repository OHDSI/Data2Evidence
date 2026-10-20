import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { buildVuetifyOptions } from '@ohdsi/atlas-ui'
import SortMenu from './SortMenu.vue'

const vuetify = createVuetify(buildVuetifyOptions())

// D2eMenu teleports its content into a Vuetify overlay on <body>, so the menu
// panel is queried off document, not the wrapper.
const mountSort = (over: { modelValue?: string; isLoggedIn?: boolean } = {}) =>
  mount(SortMenu, {
    props: { modelValue: 'access', isLoggedIn: true, ...over },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })

describe('SortMenu', () => {
  it('opens the menu and lists the sort options when the activator is clicked', async () => {
    const wrapper = mountSort()
    // Closed to start: the panel is not in the DOM yet.
    expect(document.body.querySelector('.d2e-menu')).toBeNull()

    await wrapper.get('[data-testid="ds-sort"]').trigger('click')
    await flushPromises()

    const menu = document.body.querySelector('.d2e-menu')
    expect(menu).not.toBeNull()
    expect(menu!.textContent).toContain('Name A-Z')
    expect(menu!.textContent).toContain('Name Z-A')
    // content-class must reach the teleported overlay — that's what the
    // min-width override keys on (and it silently no-ops if the passthrough breaks).
    expect(document.body.querySelector('.ds-sort__menu')).not.toBeNull()
    wrapper.unmount()
  })

  it('emits update:modelValue with the chosen mode when an option is picked', async () => {
    const wrapper = mountSort()
    await wrapper.get('[data-testid="ds-sort"]').trigger('click')
    await flushPromises()

    const item = Array.from(
      document.body.querySelectorAll<HTMLElement>('.d2e-menu__item'),
    ).find((el) => el.textContent?.includes('Name A-Z'))
    expect(item).toBeTruthy()
    item!.click()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['name-asc'])
    wrapper.unmount()
  })

  it('omits the Access option when logged out', async () => {
    const wrapper = mountSort({ modelValue: 'name-asc', isLoggedIn: false })
    await wrapper.get('[data-testid="ds-sort"]').trigger('click')
    await flushPromises()

    const labels = Array.from(
      document.body.querySelectorAll<HTMLElement>('.d2e-menu__item'),
    ).map((el) => el.textContent?.trim())
    expect(labels).not.toContain('Access')
    expect(labels).toEqual(expect.arrayContaining(['Name A-Z', 'Name Z-A']))
    wrapper.unmount()
  })
})
