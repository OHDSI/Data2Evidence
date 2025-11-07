import * as types from '../mutation-types'

// initial state
const state = {
  series: [],
  categories: [],
  ticks: [],
  tickType: 'years',
  ticksData: [],
  displayInfo: {},
  firstLoad: {},
}

const getters = {
  getKMCategories: modulestate => modulestate.categories,
  getKMSeries: modulestate => modulestate.series,
  getTicks: modulestate => modulestate.ticks,
  getTickType: modulestate => modulestate.tickType,
  getTicksData: modulestate => modulestate.ticksData,
  getKMDisplayInfo: modulestate => modulestate.displayInfo,
  getKMFirstLoad: modulestate => modulestate.firstLoad,
}

// actions
const actions = {
  setKMLegends({ commit }, { categories, series }) {
    commit(types.SET_KM_LEGENDS, { categories, series })
  },
  setTicks({ commit }, { kmTicks, kmTickType }) {
    commit(types.SET_KM_TICKS, { kmTicks, kmTickType })
  },
  setTicksData({ commit }, { kmTicksData }) {
    commit(types.SET_KM_TICKS_DATA, { kmTicksData })
  },
  setKMDisplayInfo({ commit }, { displayInfo }) {
    commit(types.SET_KM_DISPLAY_INFO, { displayInfo })
  },
  setKMFirstLoad({ commit }, { firstLoad }) {
    commit(types.SET_KM_FIRST_LOAD, { firstLoad })
  },
}

// mutations
const mutations = {
  [types.SET_KM_LEGENDS](modulestate, { categories, series }) {
    modulestate.categories = categories
    modulestate.series = series
  },
  [types.SET_KM_TICKS](modulestate, { kmTicks, kmTickType }) {
    modulestate.ticks = kmTicks
    modulestate.tickType = kmTickType
  },
  [types.SET_KM_TICKS_DATA](modulestate, { kmTicksData }) {
    modulestate.ticksData = kmTicksData
  },
  [types.SET_KM_DISPLAY_INFO](modulestate, { displayInfo }) {
    modulestate.displayInfo = displayInfo
  },
  [types.SET_KM_FIRST_LOAD](modulestate, { firstLoad }) {
    modulestate.firstLoad = firstLoad
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
