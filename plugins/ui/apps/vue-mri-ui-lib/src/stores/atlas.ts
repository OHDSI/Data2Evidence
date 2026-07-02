import { defineStore } from 'pinia'

interface AtlasState {
  showAtlas: boolean
  atlasPath: string
}

// Map a (possibly Atlas Lite) deep-link path to the equivalent Atlas3 hash route.
//   Atlas Lite                     -> Atlas3
//   /#/cohortdefinition/{id}       -> /#/cohorts/{id}   (specific cohort definition)
//   /#/cohortdefinitions           -> /#/cohorts        (cohort definitions list)
export const toAtlas3Path = (path: string): string => {
  if (!path) return '/#/cohorts'
  const match = path.match(/^\/#\/cohortdefinition\/(\d+)/)
  if (match) return `/#/cohorts/${match[1]}`
  if (path.startsWith('/#/cohortdefinitions')) return '/#/cohorts'
  return path
}

export const useAtlasStore = defineStore('atlas', {
  state: (): AtlasState => ({
    showAtlas: false,
    atlasPath: '',
  }),
  actions: {
    openAtlas(path: string) {
      this.showAtlas = true
      this.atlasPath = toAtlas3Path(path)
    },
    closeAtlas() {
      this.showAtlas = false
      this.atlasPath = ''
    },
  },
})
