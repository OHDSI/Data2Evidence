import { mount } from '@vue/test-utils'
import { describe, it, expect, afterEach } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createStore } from 'vuex'
import CohortComparisonContainer from '../CohortComparisonContainer.vue'
import Constants from '../../utils/Constants'

const vuetify = createVuetify({ components, directives })

const createTestStore = () =>
  createStore({
    getters: {
      getText:
        () =>
        (key: string): string =>
          key,
    },
  })

const clearBody = (): void => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
}

afterEach(clearBody)

const mountContainer = () =>
  mount(CohortComparisonContainer, {
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
  })

describe('CohortComparisonContainer export toast', () => {
  // The container lives inside a MessageBox dialog, whose dimming layer sits at
  // z-index 10001 (styles/messageBox.scss). Vuetify teleports the snackbar to
  // <body> with a much lower default, which would hide the toast behind the dim.
  const MESSAGE_BOX_Z_INDEX = 10001

  it('renders the export toast above the dialog dimming overlay', async () => {
    const wrapper = mountContainer()

    await (wrapper.vm as any).showExportToast('success')
    await wrapper.vm.$nextTick()

    const overlay = document.querySelector('.v-snackbar') as HTMLElement
    expect(overlay).toBeTruthy()
    expect(Number(overlay.style.zIndex)).toBeGreaterThan(MESSAGE_BOX_Z_INDEX)
  })

  it('pins the snackbar z-index to the shared constant', () => {
    expect(Constants.SnackbarZIndex).toBeGreaterThan(MESSAGE_BOX_Z_INDEX)
  })
})
