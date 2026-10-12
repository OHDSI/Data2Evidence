import { mount } from '@vue/test-utils'
import { describe, it, expect, afterEach } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createStore } from 'vuex'
import CohortComparisonContainer from '../CohortComparisonContainer.vue'
import ImageExport from '../ImageExport.vue'
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

describe('CohortComparisonContainer image export result', () => {
  const openExport = async () => {
    const wrapper = mountContainer()
    ;(wrapper.vm as any).showDownloadPNGDialog = true
    await wrapper.vm.$nextTick()
    const exporter = wrapper.findComponent(ImageExport)
    expect(exporter.exists()).toBe(true)
    return { wrapper, exporter }
  }

  const finishExport = async (wrapper, exporter, payload) => {
    exporter.vm.$emit('closeEv', payload)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
  }

  it('shows the success toast and closes the exporter when the PNG was saved', async () => {
    const { wrapper, exporter } = await openExport()

    await finishExport(wrapper, exporter, { success: true, cancelled: false })

    expect((wrapper.vm as any).snackbar).toMatchObject({ visible: true, type: 'success' })
    expect(document.body.textContent).toContain('MRI_PA_EXPORT_SUCCESS')
    expect(document.querySelector('.snackbar-success-icon')).toBeTruthy()
    expect(wrapper.findComponent(ImageExport).exists()).toBe(false)
  })

  it('shows the error toast when the export failed', async () => {
    const { wrapper, exporter } = await openExport()

    await finishExport(wrapper, exporter, { success: false, cancelled: false })

    expect((wrapper.vm as any).snackbar).toMatchObject({ visible: true, type: 'error' })
    expect(document.body.textContent).toContain('MRI_PA_EXPORT_FAILED')
    expect(document.querySelector('.snackbar-error-icon')).toBeTruthy()
    expect(wrapper.findComponent(ImageExport).exists()).toBe(false)
  })

  it('shows no toast when the save picker was dismissed', async () => {
    const { wrapper, exporter } = await openExport()

    await finishExport(wrapper, exporter, { success: false, cancelled: true })

    expect((wrapper.vm as any).snackbar.visible).toBe(false)
    expect(document.querySelector('.v-snackbar')).toBeNull()
    expect(wrapper.findComponent(ImageExport).exists()).toBe(false)
  })

  it('passes the chart busy state to the exporter', async () => {
    const wrapper = mountContainer()
    ;(wrapper.vm as any).setChartBusy(true)
    ;(wrapper.vm as any).showDownloadPNGDialog = true
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(ImageExport).props('chartBusy')).toBe(true)
  })
})
