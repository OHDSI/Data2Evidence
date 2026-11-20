import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'vuex'
import DownloadMenu from '../DownloadMenu.vue'
import { pickSaveTarget, setPendingSaveTarget } from '../../utils/saveFile'

const imageExportModule = vi.hoisted(() => ({ loaded: vi.fn(), fail: false }))

vi.mock('../ImageExport.vue', () => {
  if (imageExportModule.fail) throw new Error('chunk load failed')
  imageExportModule.loaded()
  return { default: { name: 'ImageExport', render: () => null } }
})

vi.mock('../../utils/saveFile', () => ({
  pickSaveTarget: vi.fn(),
  setPendingSaveTarget: vi.fn(),
  clearPendingSaveTarget: vi.fn(),
}))

const createTestStore = (chartConfigs: Record<string, unknown> = { list: { zipDownloadEnabled: true } }) => {
  const setFireDownloadZIP = vi.fn()
  const store = createStore({
    state: { zipDownloadCompleted: false },
    getters: {
      getText: () => (key: string) => key,
      getAllChartConfigs: () => chartConfigs,
      getActiveChart: () => 'list',
      getActiveBookmark: () => null,
      getCurrentPatientCount: () => 10,
      getCSVDownloadError: () => false,
      getZIPDownloadCompleted: state => state.zipDownloadCompleted,
      getZIPDownloadError: () => false,
    },
    mutations: {
      completeZip: state => {
        state.zipDownloadCompleted = true
      },
    },
    actions: { setFireDownloadZIP },
  })
  return { store, setFireDownloadZIP }
}

const mountMenu = store =>
  mount(DownloadMenu, {
    global: {
      plugins: [store],
      stubs: {
        DisabledHoverPopover: { template: '<div><slot /></div>' },
        bsDropdown: true,
        bsDropdownItem: true,
        downloadCSVDialog: true,
        imageExport: true,
        VSnackbar: true,
        appIcon: true,
      },
    },
  })

describe('DownloadMenu ZIP export', () => {
  beforeEach(() => {
    vi.mocked(pickSaveTarget).mockReset()
    vi.mocked(setPendingSaveTarget).mockReset()
  })

  it('ignores a second ZIP click while the first export is still running', async () => {
    const { store, setFireDownloadZIP } = createTestStore()
    const wrapper = mountMenu(store)
    vi.mocked(pickSaveTarget).mockResolvedValueOnce({ kind: 'fallback', fileName: 'a.zip' })

    await (wrapper.vm as any).handleMenuClick('zip')
    // Had it been let through, dismissing this picker would reset the pending download
    vi.mocked(pickSaveTarget).mockResolvedValueOnce(null)
    await (wrapper.vm as any).handleMenuClick('zip')

    expect(pickSaveTarget).toHaveBeenCalledTimes(1)
    expect(setFireDownloadZIP).toHaveBeenCalledTimes(1)

    // The first export still gets its toast when it finishes
    store.commit('completeZip')
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).snackbar).toMatchObject({ visible: true, type: 'success' })
  })

  it('allows another ZIP once the previous one has reported back', async () => {
    const { store, setFireDownloadZIP } = createTestStore()
    const wrapper = mountMenu(store)
    vi.mocked(pickSaveTarget).mockResolvedValue({ kind: 'fallback', fileName: 'a.zip' })

    await (wrapper.vm as any).handleMenuClick('zip')
    store.commit('completeZip')
    await wrapper.vm.$nextTick()
    await (wrapper.vm as any).handleMenuClick('zip')

    expect(setFireDownloadZIP).toHaveBeenCalledTimes(2)
  })

  it('allows a ZIP again after its save picker was dismissed', async () => {
    const { store, setFireDownloadZIP } = createTestStore()
    const wrapper = mountMenu(store)
    vi.mocked(pickSaveTarget).mockResolvedValueOnce(null)
    vi.mocked(pickSaveTarget).mockResolvedValueOnce({ kind: 'fallback', fileName: 'a.zip' })

    await (wrapper.vm as any).handleMenuClick('zip')
    await (wrapper.vm as any).handleMenuClick('zip')

    expect(pickSaveTarget).toHaveBeenCalledTimes(2)
    expect(setFireDownloadZIP).toHaveBeenCalledTimes(1)
  })
})

describe('DownloadMenu PNG export', () => {
  const mountImageMenu = () => mountMenu(createTestStore({ list: { imageDownloadEnabled: true } }).store)

  it('reports a PNG export error and stays usable when the exporter fails to load', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    imageExportModule.fail = true
    const wrapper = mountImageMenu()

    await (wrapper.vm as any).handleMenuClick('image')

    imageExportModule.fail = false
    expect(consoleError).toHaveBeenCalled()
    expect((wrapper.vm as any).imageShow).toBe(false)
    expect((wrapper.vm as any).pendingDownload).toBeNull()
    expect((wrapper.vm as any).snackbar).toMatchObject({ visible: true, type: 'error', text: 'MRI_PA_EXPORT_FAILED' })
    consoleError.mockRestore()
  })

  it('starts loading the image exporter when a menu offering PNG opens', async () => {
    const zipOnly = mountMenu(createTestStore().store)
    zipOnly.findComponent({ name: 'bs-dropdown' }).vm.$emit('show')
    await vi.dynamicImportSettled()
    expect(imageExportModule.loaded).not.toHaveBeenCalled()

    const withImage = mountImageMenu()
    expect(imageExportModule.loaded).not.toHaveBeenCalled()

    withImage.findComponent({ name: 'bs-dropdown' }).vm.$emit('show')
    await vi.dynamicImportSettled()
    expect(imageExportModule.loaded).toHaveBeenCalledTimes(1)
  })

  it('shows the image exporter once its chunk has loaded', async () => {
    const wrapper = mountImageMenu()

    await (wrapper.vm as any).handleMenuClick('image')

    expect((wrapper.vm as any).imageShow).toBe(true)
    expect((wrapper.vm as any).pendingDownload).toBe('image')
  })
})
