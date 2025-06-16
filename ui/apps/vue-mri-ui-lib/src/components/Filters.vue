<template>
  <div class="filters">
    <div ref="filtercardScrollContainer" class="filters-content">
      <boolcontainer :id="query.model.result" @toggle="toggleExclusion"></boolcontainer>
    </div>
    <filtersFooter @add="addFilterCardHandler"></filtersFooter>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
import boolcontainer from './BoolContainer.vue'
import filtersFooter from './FiltersFooter.vue'

interface AddFilterCardPayload {
  configPath: string
}

const store = useStore()

const showExclusion = ref<boolean>(false)
const useQueryFilter = ref<boolean>(true)
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
