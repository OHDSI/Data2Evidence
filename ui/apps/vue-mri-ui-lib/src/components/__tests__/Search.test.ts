import { createStore } from 'vuex'
import { shallowMount, mount } from '@vue/test-utils'
import Search from '../search/Search.vue'
import ResultsPage from '../search/ResultsPage.vue'
import NoteView from '../search/NoteView.vue'
import MicroscopeSvg from '../search/MicroscopeSvg.vue'
import Pager from '../Pager.vue'

describe('Search.vue', () => {
  let store
  // Search and ResultsPage store setup
  const actions = {
    setResultsPage: jest.fn(),
  }
  const mutations = {
    setResultsPage: (state, value) => (state.resultsPage = value),
  }
  const createGetters = (results = [], query = '') => ({
    getText: (_, __) => (key, args) => args,
    getIFR: jest.fn(),
    notesCount: () => results.reduce((acc, patientNote) => acc + patientNote.notes.length, 0),
    patientCount: () => results.length,
    resultsPage: state => state.resultsPage,
    searchQuery: () => query,
    searchResults: () => results,
  })
  const initGetters = createGetters()
  const testQuery = 'test query'
  const testNotes = [
    {
      patientId: '1',
      notes: [
        {
          noteId: '1',
          noteTitle: 'Test Note 1',
          noteText: 'Expanded Note Text For Test Note 1',
          noteSnippet: 'Snippet 1',
          patientId: '1',
        },
        {
          noteId: '2',
          noteTitle: 'Test Note 2',
          noteText: 'Expanded Note Text For Test Note 2',
          noteSnippet: 'Snippet 2',
          patientId: '1',
        },
      ],
    },
    {
      patientId: '2',
      notes: [
        {
          noteId: '3',
          noteTitle: 'Test Note 3',
          noteText: 'Expanded Note Text For Test Note 3',
          noteSnippet: 'Snippet 3',
          patientId: '2',
        },
      ],
    },
  ]
  const searchGetters = createGetters(testNotes, testQuery)
  const createSearchStore = (overrideGetters = {}) => {
    return createStore({
      state: {
        resultsPage: 1,
      },
      actions,
      mutations,
      getters: {
        ...initGetters,
        ...overrideGetters,
      },
    })
  }

  beforeEach(() => {
    store = createSearchStore()
  })

  it('initially displays search bar with placeholder image', () => {
    const wrapper = shallowMount(Search as any, {
      global: {
        plugins: [store],
        stubs: ['Pager', 'd4l-search', 'd4l-icon-arrow-back'],
      },
    })

    expect(wrapper.find('d4l-search-stub').exists()).toBe(true)
    expect(wrapper.findComponent(MicroscopeSvg).exists()).toBe(true)
  })

  it('shows an empty result page without placeholder image', () => {
    store = createSearchStore({
      searchQuery: () => testQuery,
    })
    const wrapper = mount(Search as any, {
      global: {
        plugins: [store],
        stubs: ['Pager', 'd4l-search', 'd4l-icon-arrow-back'],
      },
    })

    expect(wrapper.findComponent(MicroscopeSvg).exists()).toBe(false)
    expect(wrapper.findComponent(ResultsPage).exists()).toBe(true)
    expect(wrapper.text()).toContain('0')
    expect(wrapper.text()).toContain(testQuery)
  })

  it('displays results and result count for multiple patient notes', () => {
    store = createSearchStore(searchGetters)
    const wrapper = mount(Search as any, {
      global: {
        plugins: [store],
        stubs: ['Pager', 'd4l-search', 'd4l-icon-arrow-back'],
      },
    })

    const expectedCount = searchGetters.notesCount()
    expect(wrapper.text()).toContain(`${expectedCount}`)
    searchGetters.searchResults().forEach(patientNote => {
      expect(wrapper.text()).toContain(patientNote.patientId)
      patientNote.notes.forEach(note => {
        expect(wrapper.text()).toContain(note.noteTitle)
        expect(wrapper.text()).toContain(note.noteSnippet)
      })
    })
  })

  it('paginates results when they take up more than one page', async () => {
    store = createSearchStore(searchGetters)
    const wrapper = mount(Search as any, {
      global: {
        plugins: [store],
        stubs: ['d4l-search', 'd4l-icon-arrow-back'],
      },
    })

    await wrapper.setData({ resultsPageSize: 1 })
    expect(wrapper.findComponent(Pager).exists()).toBe(true)
    expect(wrapper.text()).not.toContain(testNotes[1].notes[0].noteSnippet)

    await wrapper.findComponent(Pager).get('.pager-r').trigger('click')
    expect(actions.setResultsPage).toHaveBeenCalled()
    // store.commit('setResultsPage', 2)
    // await wrapper.setData({ resultsPageSize: 1 })
    // expect(wrapper.text()).toContain(testNotes[1].notes[0].noteSnippet)
  })

  it('switches to NoteView when a note is selected', async () => {
    store = createSearchStore(searchGetters)
    const wrapper = mount(Search as any, {
      global: {
        plugins: [store],
        stubs: ['Pager', 'd4l-search', 'd4l-icon-arrow-back'],
      },
    })

    // Warning: may break on refactor
    await wrapper.findComponent(ResultsPage).find('.noteHeader.link').trigger('click')
    expect(wrapper.findComponent(NoteView).exists()).toBe(true)

    const selectedNoteText = testNotes[0].notes[0].noteText
    expect(wrapper.text()).toContain(selectedNoteText)
  })
})
