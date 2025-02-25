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
import boolcontainer from './BoolContainer.vue'
import filterCard from './FilterCard.vue'
import filtersFooter from './FiltersFooter.vue'

export default {
  name: 'filters',
  data() {
    return {
      showExclusion: false,
    }
  },
  computed: {
    ...mapState({
      query: (state: any) => state.query,
    }),
    ...mapGetters(['getFilterCardCount', 'getText', 'getChartableFilterCards']),
    inclusionTitle() {
      const filterCount = this.getFilterCardCount({
        excludeBasicCard: true,
        excludedOnly: false,
        matchType: 'matchall',
      })
      return this.getText('MRI_PA_FILTERCARD_TITLE_INCLUSION') + ' (' + filterCount + ')'
    },
    exclusionTitle() {
      const filterCount = this.getFilterCardCount({
        excludeBasicCard: true,
        excludedOnly: true,
        matchType: 'matchall',
      })
      return this.getText('MRI_PA_FILTERCARD_TITLE_EXCLUSION') + ' (' + filterCount + ')'
    },
  },
  watch: {
    getChartableFilterCards(newVal, oldVal) {
      if (newVal && oldVal.length < newVal.length) {
        this.$nextTick(() => {
          this.$refs.filtercardScrollContainer.scrollTop = this.$refs.filtercardScrollContainer.scrollHeight
        })
      }
    },
  },
  methods: {
    ...mapActions(['addNewFilterCard']),
    addFilterCardHandler({ configPath }) {
      const payload = { configPath, isExclusion: this.showExclusion }
      this.addNewFilterCard(payload)
    },
    toggleExclusion(isToggled) {
      this.showExclusion = isToggled
    },
  },
  components: {
    boolcontainer,
    filterCard,
    filtersFooter,
  },
}
</script>
