<script lang="ts">
export default {
  name: 'Filters',
  compatConfig: {
    MODE: 3,
  },
}
</script>
<template>
  <div class="filters">
    <div ref="filtercardScrollContainer" class="filters-content">
      <QueryFilter v-if="useQueryFilter" ref="queryFilterRef" />
      <boolcontainer v-else :id="query.model.result" @toggle="toggleExclusion"></boolcontainer>
    </div>
    <filtersFooter
      @add="addFilterCardHandler"
      @save-atlas-cohort="handleSaveAtlasCohort"
      :is-using-query-filter="useQueryFilter"
    ></filtersFooter>
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
const queryFilterRef = ref<any>()

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

const handleSaveAtlasCohort = async (cohortData: any) => {
  if (useQueryFilter.value && queryFilterRef.value) {
    // Get the Atlas JSON from QueryFilter component
    const atlasJson = queryFilterRef.value.convertToAtlasFormat()

    // Create a complete cohort definition with all required fields
    const now = Date.now() // Use timestamp instead of ISO string
    const cohortDefinition = {
      name: cohortData.name,
      description: cohortData.description || `Cohort definition created from QueryFilter`,
      expressionType: 'SIMPLE_EXPRESSION',
      expression: JSON.stringify(atlasJson),
      tags: cohortData.tags || [],
      createdBy: 'current_user', // This should come from user context
      createdDate: now,
      modifiedBy: 'current_user', // This should come from user context
      modifiedDate: now,
    }
    console.log('cohortData', cohortData)
    try {
      if (cohortData.id) {
        // Parse ID as integer
        const numericId = parseInt(cohortData.id)

        // Update existing cohort
        await store.dispatch('fireUpdateAtlasCohortDefinitionQuery', {
          content: {
            id: numericId,
            ...cohortDefinition,
          },
        })
      } else {
        // Create new cohort
        await store.dispatch('fireCreateAtlasCohortDefinitionQuery', { content: cohortDefinition })
      }
    } catch (error) {
      console.error('Error saving Atlas cohort:', error)
    }
  }
}
</script>
