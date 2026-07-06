import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createStore } from 'vuex'
import { vi } from 'vitest'
import { usePortalContextStore } from '../../stores/portalContext'
import { useAtlasStore } from '../../stores/atlas'

vi.mock('../../composables/useDeepLink', () => ({
  useDeepLink: () => ({
    processDeepLink: () => Promise.resolve(),
  }),
}))

vi.mock('../../components/PatientAnalytics.vue', () => ({
  default: {
    name: 'patientanalytics',
    template: '<div data-test="patientanalytics" />',
  },
}))

vi.mock('../../views/AtlasView.vue', () => ({
  default: {
    name: 'AtlasView',
    template: '<div data-test="atlas-view" />',
  },
}))

vi.mock('../../components/NotificationStack.vue', () => ({
  default: {
    name: 'NotificationStack',
    template: '<div data-test="notifications" />',
  },
}))

vi.mock('../../components/SplashScreen.vue', () => ({
  default: {
    name: 'SplashScreen',
    template: '<div data-test="splash" />',
  },
}))

describe('App startup', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createVuexStore = ({ initialLoad = true, datasetReloadInProgress = false } = {}) =>
    createStore({
      getters: {
        getConfigSelectionDialogState: () => ({ show: false }),
        getInitialLoad: () => initialLoad,
        getDatasetReloadInProgress: () => datasetReloadInProgress,
      },
      actions: {
        requestMriConfig: () => Promise.resolve(),
        setDataset: () => undefined,
        setDatasetReleaseId: () => undefined,
        toggleConfigSelectionDialog: () => undefined,
        setFireRequest: () => undefined,
        refreshPatientCount: () => undefined,
        setLocale: () => undefined,
      },
      mutations: {
        RESET_DATASET_CACHE: () => undefined,
      },
    })

  it('mounts patientanalytics while initial load splash is visible', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const atlasStore = useAtlasStore()
    atlasStore.closeAtlas()

    const portalContext = usePortalContextStore()
    portalContext.applyProps({
      datasetId: 'dataset-1',
      releaseId: 'release-1',
    })

    const App = (await import('../../App.vue')).default
    const wrapper = mount(App as any, {
      global: {
        plugins: [pinia, createVuexStore()],
      },
    })

    expect(wrapper.find('patientanalytics').exists()).toBe(true)
    expect(wrapper.find('splashscreen').exists()).toBe(true)
  })

  it('shows splash during dataset reload after initial load', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const atlasStore = useAtlasStore()
    atlasStore.closeAtlas()

    const portalContext = usePortalContextStore()
    portalContext.applyProps({
      datasetId: 'dataset-1',
      releaseId: 'release-1',
    })

    const App = (await import('../../App.vue')).default
    const wrapper = mount(App as any, {
      global: {
        plugins: [pinia, createVuexStore({ initialLoad: false, datasetReloadInProgress: true })],
      },
    })

    expect(wrapper.find('patientanalytics').exists()).toBe(true)
    expect(wrapper.find('splashscreen').exists()).toBe(true)
  })
})
