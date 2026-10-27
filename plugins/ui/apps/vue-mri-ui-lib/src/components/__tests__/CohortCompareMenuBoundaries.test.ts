import { mount } from '@vue/test-utils'
import { describe, it, expect, afterEach } from 'vitest'
import { h } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createStore } from 'vuex'
import { D2eDialog } from '@d2e/ui'
import CohortComparisonContainer from '../CohortComparisonContainer.vue'
import CohortCompareAxisButton from '../CohortCompareAxisButton.vue'
import CohortCompareSortButton from '../CohortCompareSortButton.vue'
import CohortCompareKMMenuButton from '../CohortCompareKMMenuButton.vue'
import DropDownMenu from '../DropDownMenu.vue'

const vuetify = createVuetify({ components, directives })

const createTestStore = () =>
  createStore({
    getters: {
      getText:
        () =>
        (key: string): string =>
          key,
      getMriFrontendConfig: () => ({}),
      getChartableFilterCards: () => [],
    },
  })

const clearBody = (): void => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
}

afterEach(clearBody)

const mountInsideDialog = (component, props = {}) =>
  mount(
    {
      render: () =>
        h(D2eDialog, { modelValue: true, title: 'Group Comparison' }, { default: () => h(component, props) }),
    },
    {
      attachTo: document.body,
      global: {
        plugins: [vuetify, createTestStore()],
        stubs: {
          StackBarCohortCompare: true,
          BoxplotCohortCompare: true,
          KMCohortCompare: true,
          ImageExport: true,
          DropDownMenu: true,
        },
      },
    }
  )

const cases = [
  { name: 'download menu', component: CohortComparisonContainer, props: {} },
  { name: 'axis menu', component: CohortCompareAxisButton, props: {} },
  { name: 'sort menu', component: CohortCompareSortButton, props: {} },
  { name: 'KM menu', component: CohortCompareKMMenuButton, props: {} },
]

describe('compare chart menus inside the D2eDialog', () => {
  it.each(cases)('$name is bounded by an element of the open dialog', async ({ component, props }) => {
    const wrapper = mountInsideDialog(component, props)
    await wrapper.vm.$nextTick()

    const menu = wrapper.findComponent(DropDownMenu)
    expect(menu.exists()).toBe(true)

    const boundary = document.getElementsByClassName(menu.props('boundariesElement'))[0]
    const dialog = document.querySelector('.d2e-dialog')
    expect(dialog).toBeTruthy()
    expect(boundary).toBeTruthy()
    expect(dialog.contains(boundary)).toBe(true)
    expect(boundary.contains(menu.element)).toBe(true)

    wrapper.unmount()
  })
})
