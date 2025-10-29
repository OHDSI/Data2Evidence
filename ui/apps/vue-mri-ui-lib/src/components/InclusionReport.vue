<script setup lang="ts">
import { d2eWebapiService } from '@/query-filter/services/D2eWebapiService'
import InclusionReport from './InclusionReport.vue'
import { ref } from 'vue'

const props = defineProps<{
  cohortDefinitionId: number
  sourceKey: string
  modeId: number
  datasetId: string
}>()

const isLoadingInclusionReport = ref(false)

const fetchInclusionReport = async (
  cohortDefinitionId: number,
  sourceKey: string,
  modeId: number,
  datasetId: string
) => {
  isLoadingInclusionReport.value = true
  console.log('Fetching inclusion report for cohort definition ID:', cohortDefinitionId)
  try {
    if (!modeId) modeId = 0
    const report = await d2eWebapiService.getInclusionReport(cohortDefinitionId, sourceKey, modeId, datasetId)
    console.log('Fetched inclusion report:', report)
  } catch (error) {
    console.error('Error fetching inclusion report:', error)
  } finally {
    isLoadingInclusionReport.value = false
  }
}
</script>

<template>
  <slot />
  <button @click="fetchInclusionReport(cohortDefinitionId, sourceKey, modeId, datasetId)">Fetch</button>
</template>

