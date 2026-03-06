<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import type { InclusionReportResponse } from '@/query-filter/types/InclusionReportTypes'
import GroupButtons from '../GroupButtons.vue'
import SummaryTable from './components/SummaryTable.vue'
import FilterControls from './components/FilterControls.vue'
import RulesTable from './components/RulesTable.vue'
import { useInclusionReportData } from './composables/useInclusionReportData'
import { useRuleManagement } from './composables/useRuleManagement'
import { useFunnelChart } from './composables/useFunnelChart'
import { useTreemapChart } from './composables/useTreemapChart'
import VButton from '@/components/vuetify/VButton.vue'
import bsDropdown from '@/lib/ui/bs-dropdown.vue'
import bsDropdownItem from '@/lib/ui/bs-dropdown-item.vue'
import appTab from '@/lib/ui/app-tab.vue'

const props = withDefaults(
  defineProps<{
    cohortDefinitionId: string
    sourceKey: string
    isReady: boolean
    generationStatus?: 'idle' | 'pending' | 'complete' | 'failed'
    cacheKey?: string
    showPersonEventSwitch?: boolean
    fetchInclusionReport: (
      cohortDefinitionId: string,
      sourceKey: string,
      modeId: number
    ) => Promise<InclusionReportResponse>
  }>(),
  {
    showPersonEventSwitch: true,
  }
)

const isFading = ref(false)

// View state
const selectedPersonEventView = ref<'PERSON' | 'EVENT'>('PERSON')
const selectedVisualization = ref<'ATTRITION' | 'INTERSECT'>('ATTRITION')

const personEventOptions = [
  { value: 'PERSON', label: 'By person' },
  { value: 'EVENT', label: 'By event' },
]
const visualizationOptions = [
  { value: 'ATTRITION', text: 'Attrition' },
  { value: 'INTERSECT', text: 'Intersect' },
]

// Use composables - order matters here!
// First, get the data fetching composable (without filtered summary initially)
const dataComposable = useInclusionReportData(
  {
    cohortDefinitionId: props.cohortDefinitionId,
    sourceKey: props.sourceKey,
    isReady: props.isReady,
    generationStatus: props.generationStatus,
    cacheKey: props.cacheKey,
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

const { funnelChartRef, downloadFunnelChart, downloadFunnelChartCSV } = useFunnelChart(
  inclusionReportResponse,
  draggableAttritionStats
)

const { treemapChartRef, disposeTreemap, downloadTreemapImage, downloadTreemapCSV } = useTreemapChart(
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

async function handleVisualizationChange(newView: 'ATTRITION' | 'INTERSECT') {
  isFading.value = true
  await new Promise(r => setTimeout(r, 200))
  selectedVisualization.value = newView
  await nextTick()
  isFading.value = false
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

  <div v-if="isLoadingInclusionReport" class="status-message loading"><d4l-spinner /></div>

  <div v-else-if="inclusionReportResponse" class="inclusion-report-container">
    <!-- Summary Table -->
    <SummaryTable :summary="inclusionReportResponse.summary" />

    <div v-if="hasInclusionRules" class="inclusion-rules-detail">
      <!-- Visualization Type Selector -->
      <div class="group-buttons-container">
        <!-- <group-buttons
          :options="visualizationOptions"
          :limit-value="selectedVisualization"
          @update-limit-value="handleVisualizationChange($event as 'ATTRITION' | 'INTERSECT')"
          class="person-event-view-buttons"
        /> -->
        <appTab
          class="visualization-tabs"
          :tabItems="visualizationOptions"
          :value="selectedVisualization"
          @onSelectedChange="handleVisualizationChange($event as 'ATTRITION' | 'INTERSECT')"
        />
      </div>
      <div class="tab-content" :class="{ 'tab-fading': isFading }">
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
            <div class="chart-header">
              <h4>Attrition plot</h4>
              <bs-dropdown variant="link" size="sm" no-caret align="right">
                <template v-slot:button-content>
                  <VButton rounded variant="outlined" class="download-btn" title="Export">Export</VButton>
                </template>
                <bs-dropdown-item @click="downloadFunnelChartCSV">Export to CSV File</bs-dropdown-item>
                <bs-dropdown-item @click="downloadFunnelChart">Export to PNG File</bs-dropdown-item>
              </bs-dropdown>
            </div>
            <div ref="funnelChartRef" class="funnel-chart"></div>
          </div>
          <div v-show="selectedVisualization === 'INTERSECT'" class="chart-section">
            <div class="chart-header">
              <h4>Population treemap</h4>
              <bs-dropdown variant="link" size="sm" no-caret align="right">
                <template v-slot:button-content>
                  <VButton rounded variant="outlined" class="download-btn" title="Export">Export</VButton>
                </template>
                <bs-dropdown-item @click="downloadTreemapCSV">Export to CSV File</bs-dropdown-item>
                <bs-dropdown-item @click="downloadTreemapImage">Export to PNG File</bs-dropdown-item>
              </bs-dropdown>
            </div>
            <div ref="treemapChartRef" class="treemap-chart"></div>
          </div>
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

  .visualization-tabs {
    width: 100%;
    z-index: 1;
    padding-bottom: 4px;
    :deep(.app-list) {
      width: 100%;
      display: flex;
      justify-content: space-between;

      .app-listItem {
        width: 100%;
        background-color: transparent !important;
        color: var(--color-primary) !important;
        font-size: 16px !important;
        // font-weight: bold;
        &.app-listItemSelected {
          font-weight: 500;
        }
      }
    }
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
  color: var(--color-primary);
  font-weight: 500;
}

.status-message.no-data {
  padding: 2rem;
  text-align: center;
  color: var(--color-neutral);
}

.status-message.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
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

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h4 {
    margin: 0;
  }
}

.download-btn {
  width: fit-content;
  color: var(--color-ui-darkest-text);
  padding: 0.25rem 0.75rem;
  cursor: pointer;
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

.tab-content {
  transition: opacity 0.2s ease;
  opacity: 1;
}

.tab-fading {
  opacity: 0.1;
}
</style>
