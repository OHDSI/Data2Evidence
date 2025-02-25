import * as types from '../mutation-types'
import { i18n } from '../../lib/i18n'
import { Commit } from 'vuex'

type ModuleState = {
  locales: { [key: string]: { [key: string]: string } }
  currentLocale: string
}

type ModuleGetter = {
  getText: (key: string, param: string | string[]) => string
  getTextFromLocale: (key: string, localeCode: string) => string
}

// initial state
const state: ModuleState = {
  locales: {
    ...i18n,
  },
  currentLocale: 'en',
}

// getters
const getters = {
  getText:
    (moduleState: ModuleState, moduleGetters: ModuleGetter): ModuleGetter['getText'] =>
    (key: string, param: string | string[]) => {
      let text = moduleGetters.getTextFromLocale(key, moduleState.currentLocale)
      if (text === '') {
        // if key is not in "en_US", use "en" or "DEFAULT" as locale
        const fallbackLocale =
          moduleState.currentLocale.split('_').length === 2 ? moduleState.currentLocale.split('_')[0] : 'DEFAULT'
        text = moduleGetters.getTextFromLocale(key, fallbackLocale)

        if (text === '') {
          text = moduleGetters.getTextFromLocale(key, 'DEFAULT')
        }
        if (text === '') {
          text = key
        }
      }

      // params handle translation that require phrasing such as
      // Single: MRI_PA_VARIANT_CONSTRAINT_HELP_GENE: 'A gene name, such as {0}',
      // Multiple(Array): MRI_PA_RANGE_CONSTRAINT_HELP_GT_LT: '{0} or {1} for greater/less than'
      if (param) {
        if (Array.isArray(param)) {
          for (let i = 0; i < param.length; i += 1) {
            text = text.replace(`{${i}}`, param[i])
          }
        } else {
          text = text.replace('{0}', param)
        }
      }
      return text
    },
  getTextFromLocale:
    (moduleState: ModuleState): ModuleGetter['getTextFromLocale'] =>
    (key: string, localeCode: string) => {
      const dictionary = moduleState.locales[localeCode]
      return dictionary?.[key] ?? ''
    },
}

// actions
const actions = {
  addLocale({ commit }: { commit: Commit }, { locale }: { locale: { [key: string]: { [key: string]: string } } }) {
    Object.keys(locale).forEach(lang => {
      commit(types.I18N_ADD_LOCALE, { lang, texts: locale[lang] })
    })
  },
}

// mutations
const mutations = {
  [types.I18N_SET_CURRENT_LOCALE](moduleState: ModuleState, localeCode: string) {
    moduleState.currentLocale = localeCode
  },
  [types.I18N_ADD_LOCALE](
    moduleState: ModuleState,
    { lang, texts }: { lang: string; texts: { [key: string]: string } }
  ) {
    moduleState.locales[lang] = { ...moduleState.locales[lang], ...texts }
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
