import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createStore } from 'vuex'
import { vi } from 'vitest'
import AppDate from '../app-date.vue'

vi.mock('@vuepic/vue-datepicker', () => ({
  default: {
    name: 'VueDatePicker',
    props: ['modelValue'],
    template: '<div class="mock-date-picker" />',
    mounted() {
      this.$emit('update:model-value', null)
    },
  },
}))

describe('app-date.vue hydration', () => {
  it('keeps hydrated date when datepicker emits null on mount', async () => {
    const store = createStore({
      getters: {
        getText: () => 'Invalid date',
      },
    })

    const wrapper = mount(AppDate, {
      props: {
        date: new Date('2026-04-17T00:00:00.000Z'),
        configFormat: 'YYYY-MM-DD',
        datetype: 'from',
      },
      global: {
        plugins: [store],
      },
    })

    await nextTick()

    expect(wrapper.emitted('update')).toBeFalsy()
  })
})
