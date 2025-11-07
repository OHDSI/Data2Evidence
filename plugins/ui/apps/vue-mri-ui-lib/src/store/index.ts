import { createStore } from 'vuex'
import auth from './modules/auth'
import bookmark from './modules/bookmark'
import chart from './modules/chart'
import chartUtils from './modules/chartUtils'
import collections from './modules/collections'
import config from './modules/config'
import domainService from './modules/domainService'
import filter from './modules/filter'
import genomics from './modules/genomics'
import i18n from './modules/i18n'
import km from './modules/km'
import loading from './modules/loading'
import notifications from './modules/notifications'
import patientList from './modules/patientList'
import pcount from './modules/pcount'
import query from './modules/query'
import search from './modules/search'
import shared from './modules/shared'
import dqd from './modules/dqd'
import ui5 from './modules/ui5'
import cohortDefinition from './modules/cohortDefinition'

export default createStore({
  // strict: process.env.NODE_ENV !== 'production',
  modules: {
    auth,
    bookmark,
    chart,
    chartUtils,
    collections,
    config,
    domainService,
    filter,
    genomics,
    i18n,
    km,
    loading,
    notifications,
    patientList,
    pcount,
    query,
    search,
    shared,
    dqd,
    ui5,
    cohortDefinition,
  },
  state: {},
  getters: {},
  mutations: {},
  actions: {},
})
