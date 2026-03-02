<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { InclusionReportResponse } from '@/query-filter/types/InclusionReportTypes'
import GroupButtons from '../GroupButtons.vue'
import SummaryTable from './components/SummaryTable.vue'
import FilterControls from './components/FilterControls.vue'
import RulesTable from './components/RulesTable.vue'
import { useInclusionReportData } from './composables/useInclusionReportData'
import { useRuleManagement } from './composables/useRuleManagement'
import { useFunnelChart } from './composables/useFunnelChart'
import { useTreemapChart } from './composables/useTreemapChart'

const props = withDefaults(
  defineProps<{
    cohortDefinitionId: string
    sourceKey: string
    patientCount: number | null
    generationStatus?: 'idle' | 'pending' | 'complete' | 'failed'
    showPersonEventSwitch?: boolean
    useMockData?: boolean
    fetchInclusionReport: (
      cohortDefinitionId: string,
      sourceKey: string,
      modeId: number
    ) => Promise<InclusionReportResponse>
  }>(),
  {
    showPersonEventSwitch: true,
    useMockData: false,
  }
)

// View state
const selectedPersonEventView = ref<'PERSON' | 'EVENT'>('PERSON')
const selectedVisualization = ref<'ATTRITION' | 'INTERSECT'>('ATTRITION')

const personEventOptions = [
  { value: 'PERSON', label: 'By person' },
  { value: 'EVENT', label: 'By event' },
]
const visualizationOptions = [
  { value: 'ATTRITION', label: 'Attrition' },
  { value: 'INTERSECT', label: 'Intersect' },
]

// Use composables - order matters here!
// First, get the data fetching composable (without filtered summary initially)
const dataComposable = useInclusionReportData(
  {
    cohortDefinitionId: props.cohortDefinitionId,
    sourceKey: props.sourceKey,
    patientCount: props.patientCount,
    generationStatus: props.generationStatus,
    useMockData: props.useMockData,
    fetchInclusionReport: props.fetchInclusionReport,
  },
  selectedPersonEventView
)

const {
  isLoadingInclusionReport,
  inclusionReportResponse,
  hasInclusionRules,
  treemapData,
  shouldFetchInclusionReport,
  fetchInclusionReportInternal,
  resetData,
} = dataComposable

// Then get rule management which depends on inclusionReportResponse
const {
  checkedRulesIds,
  draggableAttritionStats,
  allAnyOption,
  passedFailedOption,
  toggleRuleSelection,
  isRuleChecked,
  areAllRulesChecked,
  toggleAllRules,
  handleDragEnd,
  getRowIndex,
  moveRowUp,
  moveRowDown,
  handleAllAnyChange,
  handlePassedFailedChange,
  filteredSummary,
} = useRuleManagement(inclusionReportResponse, treemapData)

const { funnelChartRef } = useFunnelChart(inclusionReportResponse, draggableAttritionStats)

const { treemapChartRef, disposeTreemap } = useTreemapChart(
  treemapData,
  checkedRulesIds,
  allAnyOption,
  passedFailedOption,
  selectedVisualization
)

// Event handlers
function handlePersonEventViewChange(newView: 'PERSON' | 'EVENT') {
  selectedPersonEventView.value = newView
  if (shouldFetchInclusionReport.value) {
    fetchInclusionReportInternal(props.cohortDefinitionId, props.sourceKey)
  }
}

function handleVisualizationChange(newView: 'ATTRITION' | 'INTERSECT') {
  selectedVisualization.value = newView
}

// Lifecycle hooks
onMounted(() => {
  if (shouldFetchInclusionReport.value) {
    fetchInclusionReportInternal(props.cohortDefinitionId, props.sourceKey)
  }
})

onUnmounted(() => {
  disposeTreemap()
})
</script>

<template>
  <div v-if="showPersonEventSwitch" class="group-buttons-container">
    <group-buttons
      :options="personEventOptions"
      :limit-value="selectedPersonEventView"
      @update-limit-value="handlePersonEventViewChange($event as 'PERSON' | 'EVENT')"
      class="person-event-view-buttons"
    />
    <p v-if="selectedPersonEventView === 'PERSON'">using 1 event per person</p>
    <p v-else>using all events</p>
  </div>

  <div v-if="isLoadingInclusionReport" class="status-message loading">Loading inclusion report...</div>

  <div v-else-if="inclusionReportResponse" class="inclusion-report-container">
    <!-- Summary Table -->
    <SummaryTable :summary="inclusionReportResponse.summary" />

    <div v-if="hasInclusionRules" class="inclusion-rules-detail">
      <!-- Visualization Type Selector -->
      <div class="group-buttons-container">
        <group-buttons
          :options="visualizationOptions"
          :limit-value="selectedVisualization"
          @update-limit-value="handleVisualizationChange($event as 'ATTRITION' | 'INTERSECT')"
          class="person-event-view-buttons"
        />
      </div>

      <!-- Filter Controls (only show in INTERSECT view) -->
      <FilterControls
        v-if="selectedVisualization === 'INTERSECT'"
        :all-any-option="allAnyOption"
        :passed-failed-option="passedFailedOption"
        @update:all-any-option="handleAllAnyChange"
        @update:passed-failed-option="handlePassedFailedChange"
      />

      <div class="rules-section">
        <!-- Rules Table -->
        <RulesTable
          :selected-visualization="selectedVisualization"
          :selected-person-event-view="selectedPersonEventView"
          :draggable-attrition-stats="draggableAttritionStats"
          :inclusion-rule-stats="inclusionReportResponse.inclusionRuleStats"
          :are-all-rules-checked="areAllRulesChecked()"
          :is-rule-checked="isRuleChecked"
          :get-row-index="getRowIndex"
          @toggle-all-rules="toggleAllRules"
          @toggle-rule-selection="toggleRuleSelection"
          @drag-end="handleDragEnd"
          @move-row-up="moveRowUp"
          @move-row-down="moveRowDown"
          @update:draggable-attrition-stats="draggableAttritionStats = $event"
        />

        <!-- Filtered Summary (only show in INTERSECT view) -->
        <div v-if="selectedVisualization === 'INTERSECT'" class="filtered-summary">
          <p>Filtered Population: {{ filteredSummary.value.toLocaleString() }} ({{ filteredSummary.percent }})</p>
        </div>

        <!-- Charts -->
        <div v-show="selectedVisualization === 'ATTRITION'" class="chart-section">
          <h4>Attrition visualization</h4>
          <div ref="funnelChartRef" class="funnel-chart"></div>
        </div>
        <div v-show="selectedVisualization === 'INTERSECT'" class="chart-section">
          <h4>Population visualization</h4>
          <div ref="treemapChartRef" class="treemap-chart"></div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="no-data">No inclusion report data available</div>
</template>

<style scoped lang="scss">
.inclusion-rules-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.group-buttons-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 16px;

  .group-button {
    width: 80%;
  }
}

.inclusion-report-container {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.rules-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.status-message,
.no-data {
  padding: 2rem;
  text-align: center;
  color: var(--color-neutral);
}

.filtered-summary {
  margin: 0.5rem 0;
  padding: 0.75rem;

  p {
    margin: 0;
    font-size: 0.95rem;
    color: #333;
  }
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  min-height: 400px;
  width: 100%;

  .funnel-chart {
    width: 100%;
    height: fit-content;
    border: 1px solid var(--color-ui-light-border, #ddd);
    border-radius: 4px;
  }

  .treemap-chart {
    height: 500px;
    width: 100%;
    border: 1px solid var(--color-ui-light-border, #ddd);
    border-radius: 4px;
  }
}
</style>
