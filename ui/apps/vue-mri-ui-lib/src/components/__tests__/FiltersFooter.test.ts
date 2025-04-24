import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import filtersFooter from '../FiltersFooter.vue'
// import BootstrapVue from 'bootstrap-vue'

// Skipped as BootstrapVue uses deprecated Vue.extend, and cannot be tested with vue 3 compat mode
describe.skip('FiltersFooter.vue', () => {
  let store
  let getters

  beforeEach(() => {
    getters = {
      getFilterCardMenu: () => null,
      getText: () => x => 'ABC',
      getBookmarksData: () => [],
    }
    store = createStore({
      getters,
      state: {},
    })
  })

  it('dummy test', () => {
    expect(true).toBe(true)
  })
  // it('renders Save button', () => {
  //   const wrapper = shallowMount(filtersFooter as any, {
  //     global: {
  //       plugins: [store, BootstrapVue]
  //     }
  //   })
  //   expect(wrapper.findComponent({ ref: 'saveBookmarkButton' }).exists()).toBe(true)
  // })
})
