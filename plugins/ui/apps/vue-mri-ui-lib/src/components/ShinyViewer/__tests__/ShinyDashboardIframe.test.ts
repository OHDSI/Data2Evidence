import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ShinyDashboardIframe from '../ShinyDashboardIframe.vue'

vi.mock('vuex', () => ({
  useStore: () => ({
    getters: {
      getText: (key: string) => key,
    },
  }),
}))

vi.mock('@/utils/PortalUtils', () => ({
  getPortalAPI: () => ({
    getToken: vi.fn().mockResolvedValue('test-token'),
  }),
}))

vi.mock('@/utils/shinyLiveUrl', async () => {
  const actual = await vi.importActual<typeof import('@/utils/shinyLiveUrl')>('@/utils/shinyLiveUrl')
  return actual
})

describe('ShinyDashboardIframe', () => {
  const originalPathname = window.location.pathname

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/d2e/portal',
      },
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: originalPathname,
      },
      configurable: true,
    })
  })

  it('uses the /d2e gateway prefix when the app is mounted under /d2e', () => {
    const wrapper = mount(ShinyDashboardIframe, {
      props: {
        datasetId: 'dataset-1',
        cohortId: 'cohort-1',
        wizardConfig: {
          dashboardType: 'calculate-incidence',
        },
      },
    })

    expect(wrapper.find('iframe').attributes('src')).toBe(
      '/d2e/gateway/api/dataset/shiny-live/dataset-1_cohort_calculate-incidence_python/'
    )
  })

  it('uses the /gateway prefix when the app is not mounted under /d2e', () => {
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/portal',
      },
      configurable: true,
    })

    const wrapper = mount(ShinyDashboardIframe, {
      props: {
        datasetId: 'dataset-1',
        cohortId: 'cohort-1',
        wizardConfig: {
          dashboardType: 'calculate-incidence',
        },
      },
    })

    expect(wrapper.find('iframe').attributes('src')).toBe(
      '/gateway/api/dataset/shiny-live/dataset-1_cohort_calculate-incidence_python/'
    )
  })
})
