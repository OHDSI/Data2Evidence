import { defineStore } from 'pinia'

interface AtlasState {
  showAtlas: boolean
  atlasPath: string
}

export const useAtlasStore = defineStore('atlas', {
  state: (): AtlasState => ({
    showAtlas: false,
    atlasPath: '',
  }),
  actions: {
    openAtlas(path: string) {
      this.showAtlas = true
      this.atlasPath = path
    },
    closeAtlas() {
      this.showAtlas = false
      this.atlasPath = ''
    },
  },
})
