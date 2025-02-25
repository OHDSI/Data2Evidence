// tslint:disable:no-shadowed-variable
import axios, { AxiosRequestConfig } from 'axios'
import jwt from 'jsonwebtoken'
import { AUTHENTICATE, AUTHENTICATE_FAILURE, SET_JWT_TOKEN_VALUE } from '../mutation-types'
import { getPortalAPI } from '../../utils/PortalUtils'

const Ajax = axios.create({
  timeout: 300000,
  headers: {
    'sap-language': document.getElementsByTagName('html')[0].lang,
  },
})

const XCSRF_TOKEN = 'x-csrf-token'

function authenticate() {
  return Ajax.get('/', {
    headers: { [XCSRF_TOKEN]: 'fetch' },
  })
    .then(response => Promise.resolve(response))
    .catch(error => Promise.reject(error))
}

// initial state
const state = {
  token: null,
  failures: null,
  jwtTokenValue: null,
}

const getters = {
  getToken: moduleState => moduleState.token,
  getJwtTokenValue: moduleState => moduleState.jwtTokenValue,
}

// actions
const actions = {
  authenticate({ state, commit }) {
    if (state.token) {
      return Promise.resolve(state.token)
    }
    return authenticate()
      .then(response => {
        Ajax.defaults.headers.common[XCSRF_TOKEN] = response.headers[XCSRF_TOKEN]
        commit(AUTHENTICATE, response)
      })
      .catch(error => commit(AUTHENTICATE_FAILURE, error))
  },
  ajaxAuth(
    { dispatch, state, getters, commit },
    { method = 'post', url, params = {}, cancelToken, responseType }: AxiosRequestConfig
  ) {
    const portalAPI = getPortalAPI()

    // [Portal] Different host if on local, url remains the same otherwise
    if (portalAPI.qeSvcUrl) {
      url = `${portalAPI.qeSvcUrl}${url}`
    } else {
      url = `${process.env.VUE_APP_HOST}${url}`
    }
    return new Promise(async (resolve, reject) => {
      let headers = {}
      const bearerToken = portalAPI ? await portalAPI.getToken() : localStorage.getItem('msaltoken')
      if (bearerToken != null) {
        headers = { Authorization: `Bearer ${bearerToken}` }
      }
      if (getters.getJwtTokenValue === null && bearerToken) {
        commit(SET_JWT_TOKEN_VALUE, jwt.decode(bearerToken))
      }
      try {
        const response = await Ajax.request({
          method,
          url,
          cancelToken,
          responseType,
          data: params,
          headers,
        })

        resolve(response)
      } catch (err) {
        reject(err)
      }
    })
  },
  ajaxFetchAuth({ dispatch, state, getters, commit }, { url, options }: any) {
    const portalAPI = getPortalAPI()

    // [Portal] Different host if on local, url remains the same otherwise
    if (portalAPI.qeSvcUrl) {
      url = `${portalAPI.qeSvcUrl}${url}`
    } else {
      url = `${process.env.VUE_APP_HOST}${url}`
    }

    return new Promise(async (resolve, reject) => {
      const bearerToken = portalAPI ? await portalAPI.getToken() : localStorage.getItem('msaltoken')
      if (bearerToken != null) {
        if (!options.headers) {
          options.headers = {}
        }
        options.headers.Authorization = `Bearer ${bearerToken}`
      }
      if (getters.getJwtTokenValue === null && bearerToken) {
        commit(SET_JWT_TOKEN_VALUE, jwt.decode(bearerToken))
      }
      try {
        const response = await fetch(url, options)

        resolve(response)
      } catch (err) {
        // redirect to b2c login
        // @ts-ignore
        // msalObj.acquireTokenRedirect({ scopes: [msalConfig.auth.clientId ] });
      }
    })
  },
}

// mutations
const mutations = {
  [AUTHENTICATE](moduleState, response) {
    moduleState.token = response.headers[XCSRF_TOKEN]
  },
  [AUTHENTICATE_FAILURE](moduleState, error) {
    moduleState.failure = error
  },
  [SET_JWT_TOKEN_VALUE](moduleState, jwtTokenValue) {
    moduleState.jwtTokenValue = jwtTokenValue
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
