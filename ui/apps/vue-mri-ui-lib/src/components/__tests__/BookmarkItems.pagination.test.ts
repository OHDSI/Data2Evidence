import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import BookmarkItems from '../BookmarkItems.vue'

vi.mock('../../utils/PortalUtils', () => ({
  getPortalAPI: () => ({ isLocal: false, username: 'tester' }),
}))

vi.mock('../helpers/bookmarkItems', () => ({
  getCardsFormatted: () => [],
  getAxisFormatted: () => [],
}))

describe('BookmarkItems pagination footer', () => {
  it('shows pagination controls for non-local mode when bookmarks exist', () => {
    const store = createStore({
      getters: {
        getText: () => (key: string) => key,
        getMriFrontendConfig: () => ({
          getAttributeByPath: () => ({ oInternalConfigAttribute: { type: 'string' } }),
        }),
        getAxis: () => () => ({}),
        getDomainValues: () => () => ({ isLoading: false, isLoaded: true, values: [] }),
        getSelectedDataset: () => ({ id: 'dataset-1' }),
      },
    })

    const wrapper = shallowMount(BookmarkItems as any, {
      global: {
        plugins: [store],
      },
      props: {
        bookmarksDisplay: [
          {
            displayName: 'Test Cohort',
            cohortDefinition: {
              id: 'cohort-1',
              description: 'test',
              cohortDefinitionName: 'Test Cohort',
              patientCount: 10,
              createdOn: '2024-01-01T00:00:00.000Z',
              createdOnFormatted: '2024-01-01',
            },
          },
        ],
        compareCohortsSelectionList: [],
        useQueryFilterForAtlas: false,
        canDatasetMaterializeCohorts: true,
      },
    })

    expect(wrapper.text()).toContain('Items per page:')
    expect(wrapper.find('select').exists()).toBe(true)
  })
})
