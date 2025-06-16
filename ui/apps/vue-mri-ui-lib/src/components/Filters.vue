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
    ...mapGetters(['getChartableFilterCards']),
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
    filtersFooter,
  },
}
</script>
