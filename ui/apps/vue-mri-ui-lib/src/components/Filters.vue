<template>
  <div class="filters">
    <div ref="filtercardScrollContainer" class="filters-content">
      <boolcontainer :id="query.model.result" @toggle="toggleExclusion"></boolcontainer>
    </div>
    <filtersFooter @add="addFilterCardHandler"></filtersFooter>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters, mapState } from 'vuex'
import { defineComponent } from 'vue'
import boolcontainer from './BoolContainer.vue'
import filtersFooter from './FiltersFooter.vue'

interface FilterCardData {
  showExclusion: boolean
}

interface AddFilterCardPayload {
  configPath: string
}

export default defineComponent({
  name: 'filters',
  data(): FilterCardData {
    return {
      showExclusion: false,
    }
  },
  computed: {
    ...mapState({
      query: (state: any) => state.query,
    }),
    ...mapGetters(['getChartableFilterCards']),
  },
  watch: {
    getChartableFilterCards(newVal: any[], oldVal: any[]) {
      if (newVal && oldVal.length < newVal.length) {
        this.$nextTick(() => {
          const container = this.$refs.filtercardScrollContainer as HTMLElement
          container.scrollTop = container.scrollHeight
        })
      }
    },
  },
  methods: {
    ...mapActions(['addNewFilterCard']),
    addFilterCardHandler({ configPath }: AddFilterCardPayload) {
      const payload = { configPath, isExclusion: this.showExclusion }
      this.addNewFilterCard(payload)
    },
    toggleExclusion(isToggled: boolean) {
      this.showExclusion = isToggled
    },
  },
  components: {
    boolcontainer,
    filtersFooter,
  },
})
</script>
