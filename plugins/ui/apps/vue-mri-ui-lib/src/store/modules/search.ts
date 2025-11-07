import QueryString from '../../utils/QueryString'
import * as types from '../mutation-types'

interface ISearchNotesState {
  searchQuery: string
  searchResults: IPatientNote[]
  patientCount: number
  resultsPage: number
}

interface IPatientNote {
  patientId: string
  notes: INote[]
}

interface INote {
  noteId: string
  noteTitle: string
  noteText: string
  noteSnippet: string
  patientId?: string
}

const endpointUrl = '/analytics-svc/api/services/search-notes'

const state = {
  searchQuery: '',
  searchResults: [],
  patientCount: 0,
  resultsPage: 1,
}

const getters = {
  notesCount: (modulestate: ISearchNotesState) => {
    return modulestate.searchResults.reduce((acc, patientNotes) => {
      return acc + patientNotes.notes.length
    }, 0)
  },
  searchQuery: (modulestate: ISearchNotesState) => modulestate.searchQuery,
  searchResults: (modulestate: ISearchNotesState) => modulestate.searchResults,
  patientCount: (modulestate: ISearchNotesState) => modulestate.patientCount,
  resultsPage: (modulestate: ISearchNotesState) => modulestate.resultsPage,
}

const actions = {
  fireMRIQuery({ dispatch }, { baseUrl, mriquery, ...params }) {
    return dispatch('ajaxAuth', {
      method: 'get',
      url: QueryString({
        url: baseUrl,
        queryString: {
          ...params,
          mriquery: JSON.stringify(mriquery),
        },
        compress: ['mriquery'],
      }),
    })
  },
  fireSearchNotesQuery({ commit, dispatch }, params) {
    return dispatch('fireMRIQuery', {
      baseUrl: endpointUrl,
      ...params,
    })
      .then(response => {
        const processedNotes = response.data
        commit(types.SET_NOTE_SEARCH_QUERY, params.query)
        commit(types.SET_NOTE_RESULTS_PAGE, 1)
        commit(types.SET_NOTE_SEARCH_RESULTS, processedNotes)
        commit(types.SET_NOTE_PATIENT_COUNT, processedNotes.length)
      })
      .catch(err => {
        // TODO
      })
  },
  setResultsPage({ commit }, pageNo) {
    commit(types.SET_NOTE_RESULTS_PAGE, pageNo)
  },
}

const mutations = {
  [types.SET_NOTE_SEARCH_QUERY]: (modulestate: ISearchNotesState, query: string) => (modulestate.searchQuery = query),
  [types.SET_NOTE_SEARCH_RESULTS]: (modulestate: ISearchNotesState, results: IPatientNote[]) =>
    (modulestate.searchResults = results),
  [types.SET_NOTE_PATIENT_COUNT]: (modulestate: ISearchNotesState, patientCount: number) =>
    (modulestate.patientCount = patientCount),
  [types.SET_NOTE_RESULTS_PAGE]: (modulestate: ISearchNotesState, pageNo: number) => (modulestate.resultsPage = pageNo),
}

export default {
  state,
  getters,
  actions,
  mutations,
}
