<template>
  <div class="filters">
    <div ref="filtercardScrollContainer" class="filters-content">
      <QueryFilter v-if="useQueryFilter" />
      <boolcontainer v-else :id="query.model.result" @toggle="toggleExclusion"></boolcontainer>
    </div>
    <filtersFooter @add="addFilterCardHandler"></filtersFooter>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
import boolcontainer from './BoolContainer.vue'
import filtersFooter from './FiltersFooter.vue'
import QueryFilter from '../query-filter/components/QueryFilter.vue'

interface AddFilterCardPayload {
  configPath: string
}

const store = useStore()

// TODO: This should come from the PA config
const useQueryFilter = ref<boolean>(true)

const showExclusion = ref<boolean>(false)
const filtercardScrollContainer = ref<HTMLElement>()

const query = computed(() => store.state.query)
const getChartableFilterCards = computed(() => store.getters.getChartableFilterCards)

watch(getChartableFilterCards, (newVal: any[], oldVal: any[]) => {
  if (newVal && oldVal.length < newVal.length) {
    nextTick(() => {
      if (filtercardScrollContainer.value) {
        filtercardScrollContainer.value.scrollTop = filtercardScrollContainer.value.scrollHeight
      }
    })
  }
})

const addFilterCardHandler = ({ configPath }: AddFilterCardPayload) => {
  const payload = { configPath, isExclusion: showExclusion.value }
  store.dispatch('addNewFilterCard', payload)
}

const toggleExclusion = (isToggled: boolean) => {
  showExclusion.value = isToggled
}
</script>
