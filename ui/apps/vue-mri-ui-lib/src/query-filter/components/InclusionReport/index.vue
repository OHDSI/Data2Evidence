<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import type { InclusionReportResponse } from '@/query-filter/types/QueryFilterTypes'
import plotly from '@/lib/CustomPlotly'
import { d2eWebapiService } from '@/query-filter/services/D2eWebapiService'
import { computeAttritionStats } from './computeAttritionStats'
import { convertTreemapData } from './computeTreemapStats'
import { shouldIncludeRect, calculateFilteredSummary } from './ruleSelectionFilter'
import GroupButtons from '../GroupButtons.vue'
import * as echarts from 'echarts'

const props = defineProps<{
  cohortDefinitionId: number
  sourceKey: string
  patientCount: number | null
  generationStatus?: 'idle' | 'pending' | 'complete' | 'failed'
}>()

const isLoadingInclusionReport = ref<boolean>(false)
const funnelChartRef = ref<HTMLElement | null>(null)
const treemapChartRef = ref<HTMLElement | null>(null)
const selectedPersonEventView = ref<'PERSON' | 'EVENT'>('PERSON')
const selectedVisualization = ref<'ATTRITION' | 'INTERSECT'>('ATTRITION')
const inclusionReportPersonResponse = ref<InclusionReportResponse | null>(null)
const inclusionReportEventResponse = ref<InclusionReportResponse | null>(null)
const echartsTreemap = ref<any>(null)
const allAnyOption = ref<'ALL' | 'ANY'>('ANY')
const passedFailedOption = ref<'PASSED' | 'FAILED'>('PASSED')
const checkedRulesIds = ref<number[]>([])

const personEventOptions = [
  { value: 'PERSON', label: 'By person' },
  { value: 'EVENT', label: 'By event' },
]
const visualizationOptions = [
  { value: 'ATTRITION', label: 'Attrition' },
  { value: 'INTERSECT', label: 'Intersect' },
]

const colors = ['#fabfb4', '#fcdab6', '#dedcab', '#cdd99e', '#53bead']

const inclusionReportResponse = computed(() => {
  return selectedPersonEventView.value === 'PERSON'
    ? inclusionReportPersonResponse.value
    : inclusionReportEventResponse.value
})

const treemapData = computed(() => {
  if (!inclusionReportResponse.value) return null
  const data = JSON.parse(inclusionReportResponse.value.treemapData)
  return convertTreemapData(data, inclusionReportResponse.value)
})

const attritionStats = computed(() => {
  return computeAttritionStats(inclusionReportResponse.value)
})

const filteredSummary = computed(() => {
  if (!treemapData.value || checkedRulesIds.value.length === 0) {
    return { value: 0, percent: '0%' }
  }

  const { value } = calculateFilteredSummary(
    treemapData.value,
    checkedRulesIds.value,
    allAnyOption.value,
    passedFailedOption.value
  )
  const baseCount = inclusionReportResponse.value?.summary.baseCount || 1
  const percent = ((value / baseCount) * 100).toFixed(2) + '%'

  return { value, percent }
})

const shouldFetchInclusionReport = computed(() => {
  return props.patientCount !== null && !(props.generationStatus === 'pending' || props.generationStatus === 'failed')
})

const funnelChartData = computed(() => {
  if (!inclusionReportResponse.value || attritionStats.value.length === 0) return null

  const summary = inclusionReportResponse.value.summary
  const stats = attritionStats.value

  // Build funnel data with base count as first level
  const labels = ['Total']
  const values = [summary.baseCount]
  const hoverTexts = ['Total: ' + summary.baseCount.toLocaleString()]

  // Add each inclusion rule with calculated statistics
  stats.forEach(stat => {
    const name = stat.name.length > 30 ? stat.name.slice(0, 30) + '...' : stat.name
    labels.push(`${stat.id + 1} - ${name}`)
    values.push(stat.countSatisfying)
    hoverTexts.push(
      `${stat.name}<br>Count: ${stat.countSatisfying.toLocaleString()}<br>Percent: ${stat.percentSatisfying}`
    )
  })
  return {
    labels,
    values,
    hoverTexts,
  }
})

const renderFunnelChart = () => {
  if (!funnelChartRef.value || !funnelChartData.value) return

  // Define thresholds and colors (hex codes from ohdsi atlas)
  const thresholds = [0.1, 0.25, 0.5, 0.75]

  // Compute ratios relative to previous layer
  const ratios = funnelChartData.value.values.map((v, i) => (i === 0 ? 1 : v / funnelChartData.value.values[i - 1]))

  // Map each ratio to a color based on thresholds
  const layerColors = ratios.map(ratio => {
    for (let i = 0; i < thresholds.length; i++) {
      if (ratio <= thresholds[i]) return colors[i]
    }
    return colors[colors.length - 1]
  })

  const trace = {
    type: 'funnel',
    y: funnelChartData.value.labels,
    x: funnelChartData.value.values,
    text: funnelChartData.value.hoverTexts,
    hoverinfo: 'text',
    textposition: 'inside',
    texttemplate: '%{x}<br>%{percentInitial:.2%}',
    constraintext: 'outside',
    textinfo: 'value+percent initial',
    marker: {
      color: layerColors,
    },
  }

  const layout = {
    height: 800,
    yaxis: { automargin: true },
    xaxis: { automargin: true },
  }

  const chartConfig = {
    responsive: true,
    displayModeBar: false,
  }

  plotly.newPlot(funnelChartRef.value, [trace], layout, chartConfig)
}

const disposeTreemap = () => {
  if (echartsTreemap.value) {
    echartsTreemap.value.dispose()
    echartsTreemap.value = null
  }
}

const renderTreemap = async () => {
  if (!treemapChartRef.value || !treemapData.value) return

  await nextTick()
  avaiableWidth.value = treemapChartRef.value.clientWidth
  // Dispose and reinitialize chart
  disposeTreemap()
  echartsTreemap.value = echarts.init(treemapChartRef.value)

  // Always apply filtering to treemap data
  const dataToRender = applyFiltering(treemapData.value)

  const option: echarts.EChartsOption = {
    tooltip: {
      show: true,
      formatter: (params: any) => {
        if (params.data && params.data.tooltip) {
          const tooltip = params.data.tooltip
          let html = `<div style="max-width: 400px; line-height: 1.6; word-wrap: break-word; word-break: break-word; white-space: normal;">`

          // Add count and summary
          html += `<div>${tooltip.count}</div>`
          html += `<div>${tooltip.summary}</div>`

          // Add passed criteria
          if (tooltip.passed && tooltip.passed.length > 0) {
            html += `<div style="margin-top: 8px; color: #90ee90; font-weight: bold;">Passed:</div>`
            tooltip.passed.forEach((rule: string) => {
              html += `<div style="margin-left: 8px;">${rule}</div>`
            })
          }

          // Add failed criteria
          if (tooltip.failed && tooltip.failed.length > 0) {
            html += `<div style="margin-top: 8px; color: #ff6b6b; font-weight: bold;">Failed:</div>`
            tooltip.failed.forEach((rule: string) => {
              html += `<div style="margin-left: 8px;">${rule}</div>`
            })
          }

          html += `</div>`
          return html
        }
        return ''
      },
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: '#333',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 16,
      },
      confine: true,
      padding: [8, 12],
    },
    series: [
      {
        type: 'treemap',
        data: [dataToRender],
        roam: 'move',
        nodeClick: false,
        breadcrumb: {
          show: false,
        },
        label: {
          show: false,
        },
        itemStyle: {
          borderColor: '#000',
          borderWidth: 0.3,
        },
      },
    ],
  }

  echartsTreemap.value.setOption(option)
}

const applyFiltering = (node: any): any => {
  const newNode: any = {
    name: node.name,
    value: node.value,
    tooltip: node.tooltip,
    itemStyle: node.itemStyle ? { ...node.itemStyle } : {},
  }

  // Process children first
  if (node.children && node.children.length > 0) {
    newNode.children = node.children.map((child: any) => applyFiltering(child))
  }

  // Check if this node should be included based on filtering criteria
  // Only apply gray color to leaf nodes (nodes without children)
  const isLeafNode = !node.children || node.children.length === 0
  const isIncluded = shouldIncludeRect(node.name, checkedRulesIds.value, allAnyOption.value, passedFailedOption.value)

  if (isLeafNode && !isIncluded) {
    // Gray out excluded leaf nodes
    newNode.itemStyle = {
      color: '#CCCCCC', // gray out excluded rect in treemap
    }
  }

  return newNode
}

function handlePersonEventViewChange(newView: 'PERSON' | 'EVENT') {
  // Clean up chart and ResizeObserver before switching views
  selectedPersonEventView.value = newView
  if (shouldFetchInclusionReport.value) {
    fetchInclusionReport(props.cohortDefinitionId, props.sourceKey)
  }
}

function handleVisualizationChange(newView: 'ATTRITION' | 'INTERSECT') {
  selectedVisualization.value = newView
}

function handleAllAnyChange(newValue: 'ALL' | 'ANY') {
  allAnyOption.value = newValue
}

function handlePassedFailedChange(newValue: 'PASSED' | 'FAILED') {
  passedFailedOption.value = newValue
}

function toggleRuleSelection(ruleId: number) {
  const index = checkedRulesIds.value.indexOf(ruleId)
  if (index > -1) {
    checkedRulesIds.value.splice(index, 1)
  } else {
    checkedRulesIds.value.push(ruleId)
  }
}

function isRuleChecked(ruleId: number): boolean {
  return checkedRulesIds.value.includes(ruleId)
}

function areAllRulesChecked(): boolean {
  if (!inclusionReportResponse.value || !inclusionReportResponse.value.inclusionRuleStats) return false
  const totalRules = inclusionReportResponse.value.inclusionRuleStats.length
  return checkedRulesIds.value.length === totalRules
}

function toggleAllRules() {
  if (!inclusionReportResponse.value || !inclusionReportResponse.value.inclusionRuleStats) return

  if (areAllRulesChecked()) {
    // Uncheck all
    checkedRulesIds.value = []
  } else {
    // Check all
    checkedRulesIds.value = inclusionReportResponse.value.inclusionRuleStats.map(r => r.id)
  }
}

const fetchInclusionReport = async (cohortDefinitionId: number, sourceKey: string) => {
  isLoadingInclusionReport.value = true

  const modeId = selectedPersonEventView.value === 'PERSON' ? 1 : 0
  try {
    if (selectedPersonEventView.value === 'PERSON' && !inclusionReportPersonResponse.value) {
      inclusionReportPersonResponse.value = await d2eWebapiService.getInclusionReport(
        cohortDefinitionId,
        sourceKey,
        modeId
      )
    } else if (selectedPersonEventView.value === 'EVENT' && !inclusionReportEventResponse.value) {
      inclusionReportEventResponse.value = await d2eWebapiService.getInclusionReport(
        cohortDefinitionId,
        sourceKey,
        modeId
      )
    }
    // mock data
    // inclusionReportResponse.value = {
    //   summary: {
    //     baseCount: 4035,
    //     finalCount: 23,
    //     lostCount: 0,
    //     percentMatched: '0.57%',
    //   },
    //   inclusionRuleStats: [
    //     {
    //       id: 0,
    //       name: 'Cancer surgery within 30 days before dx and no radio- or systemic treatment before surgery',
    //       percentExcluded: '40.45%',
    //       percentSatisfying: '1.36%',
    //       countSatisfying: 55,
    //     },
    //     {
    //       id: 1,
    //       name: 'no other malignancies ',
    //       percentExcluded: '0.79%',
    //       percentSatisfying: '41.02%',
    //       countSatisfying: 1655,
    //     },
    //   ],
    //   treemapData:
    //     '{"name" : "Everyone", "children" : [{"name" : "Group 2", "children" : [{"name": "11", "size": 23},{"name" : "Group 1", "children" : [{"name": "01", "size": 1632},{"name": "10", "size": 32},{"name" : "Group 0", "children" : [{"name": "00", "size": 2348}]}]}]}]}',
    // }
  } catch (error) {
    console.error('Error fetching inclusion report:', error)
  } finally {
    isLoadingInclusionReport.value = false
  }
}

const avaiableWidth = ref(0)

onMounted(() => {
  inclusionReportPersonResponse.value = null
  inclusionReportEventResponse.value = null
  isLoadingInclusionReport.value = false

  if (shouldFetchInclusionReport.value) {
    fetchInclusionReport(props.cohortDefinitionId, props.sourceKey)
  }
})

watch(
  () => inclusionReportResponse.value,
  newResponse => {
    if (newResponse && newResponse.inclusionRuleStats) {
      // Initialize checkedRulesIds with all rule IDs
      checkedRulesIds.value = newResponse.inclusionRuleStats.map(r => r.id)
    }
  }
)

onUnmounted(() => {
  disposeTreemap()
})

// Watch for changes in sourceKey and decide whether to fetch inclusion report
watch(
  () => props.sourceKey,
  newSourceKey => {
    inclusionReportPersonResponse.value = null
    inclusionReportEventResponse.value = null
    disposeTreemap()
    if (shouldFetchInclusionReport.value) {
      fetchInclusionReport(props.cohortDefinitionId, newSourceKey)
    }
  }
)

// Watch for changes in shouldFetchInclusionReport and decide whether to fetch inclusion report
watch(shouldFetchInclusionReport, shouldFetch => {
  if (shouldFetch) {
    fetchInclusionReport(props.cohortDefinitionId, props.sourceKey)
  } else {
    inclusionReportPersonResponse.value = null
    inclusionReportEventResponse.value = null
  }
})

// Watch for changes in funnelChartData to render funnel chart
watch(
  () => funnelChartData.value,
  () => {
    renderFunnelChart()
  },
  { flush: 'post' } // Ensure <div ref="funnelChartRef"> exists
)

watch(
  () => [treemapData.value, selectedVisualization.value],
  () => {
    // Only render if we're in INTERSECT view
    if (selectedVisualization.value !== 'INTERSECT' || !treemapData.value) {
      return
    }
    renderTreemap()
  },
  { flush: 'post' } // Ensure <div ref="treemapChartRef"> exists
)

watch(
  () => [allAnyOption.value, passedFailedOption.value, checkedRulesIds.value],
  () => {
    // Re-render treemap when filtering options change
    if (selectedVisualization.value === 'INTERSECT' && treemapData.value) {
      renderTreemap()
    }
  },
  { deep: true }
)
</script>

<template>
  <div class="group-buttons-container">
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
    <div class="summary-section">
      <h4>Summary</h4>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Match rate</th>
            <th>Matches</th>
            <th>Total events</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ inclusionReportResponse.summary.percentMatched }}</td>
            <td>{{ inclusionReportResponse.summary.finalCount }}</td>
            <td>{{ inclusionReportResponse.summary.baseCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Inclusion Rule Stats Table -->
    <div class="group-buttons-container">
      <group-buttons
        :options="visualizationOptions"
        :limit-value="selectedVisualization"
        @update-limit-value="handleVisualizationChange($event as 'ATTRITION' | 'INTERSECT')"
        class="person-event-view-buttons"
      />
    </div>

    <!-- Any/All Rule Selector (only show in INTERSECT view) -->
    <div v-if="selectedVisualization === 'INTERSECT'" class="all-any-selector">
      <span>Having</span>
      <select v-model="allAnyOption" @change="handleAllAnyChange(allAnyOption)">
        <option value="ALL">ALL</option>
        <option value="ANY">ANY</option>
      </select>
      <span>of selected criteria</span>
      <select v-model="passedFailedOption" @change="handlePassedFailedChange(passedFailedOption)">
        <option value="PASSED">PASSED</option>
        <option value="FAILED">FAILED</option>
      </select>
    </div>

    <div class="rules-section">
      <h4>Inclusion Rules</h4>
      <table class="rules-table">
        <thead>
          <tr>
            <th v-if="selectedVisualization === 'INTERSECT'">
              <input
                type="checkbox"
                :checked="areAllRulesChecked()"
                @change="toggleAllRules()"
                title="Select/unselect all rules"
              />
            </th>
            <th>ID</th>
            <th>Inclusion rule</th>
            <!-- count satisfying -->
            <th>N</th>
            <!-- percent satisfying -->
            <th v-if="selectedVisualization === 'ATTRITION'">% remain</th>
            <th v-else>% satisfied</th>
            <!-- percent excluded -->
            <th v-if="selectedVisualization === 'ATTRITION'">% diff</th>
            <th v-else>% to-gain</th>
          </tr>
        </thead>
        <tbody v-if="selectedVisualization === 'ATTRITION'">
          <tr v-for="stat in attritionStats" :key="stat.id">
            <td>{{ stat.id + 1 }}</td>
            <td class="rule-name">{{ stat.name }}</td>
            <td>{{ stat.countSatisfying.toLocaleString() }}</td>
            <td>{{ stat.percentSatisfying }}</td>
            <td>{{ stat.pctDiff }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="stat in inclusionReportResponse.inclusionRuleStats" :key="stat.id">
            <td>
              <input type="checkbox" :checked="isRuleChecked(stat.id)" @change="toggleRuleSelection(stat.id)" />
            </td>
            <td>{{ stat.id + 1 }}</td>
            <td class="rule-name">{{ stat.name }}</td>
            <td>{{ stat.countSatisfying.toLocaleString() }}</td>
            <td>{{ stat.percentSatisfying }}</td>
            <td>{{ stat.percentExcluded }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="selectedVisualization === 'INTERSECT'" class="filtered-summary">
        <p>Filtered Population: {{ filteredSummary.value.toLocaleString() }} ({{ filteredSummary.percent }})</p>
      </div>

      <!-- Plotly Funnel chart -->
      <div v-show="selectedVisualization === 'ATTRITION'" class="chart-section">
        <h4>Attrition visualization</h4>
        <div ref="funnelChartRef" class="funnel-chart"></div>
      </div>
      <!-- Echarts Treemap chart -->
      <div v-show="selectedVisualization === 'INTERSECT'" class="chart-section">
        <h4>Populatiom visualization</h4>
        <div ref="treemapChartRef" class="treemap-chart"></div>
      </div>
    </div>
  </div>

  <div v-else class="no-data">No inclusion report data available</div>
</template>

<style scoped>
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
table {
  font-size: 16px;
}
.rule-name {
  max-width: 70ch;
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

.summary-section,
.rules-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary, #333);
}

.summary-table,
.rules-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ddd;
}

.summary-table thead,
.rules-table thead {
  background-color: #f5f5f5;
}

.summary-table th,
.rules-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 500;
  border-bottom: 2px solid #ddd;
  color: #333;
}

.summary-table td,
.rules-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #ddd;
  color: #666;
}

.summary-table tbody tr:hover,
.rules-table tbody tr:hover {
  background-color: #f9f9f9;
}

.status-message,
.no-data {
  padding: 2rem;
  text-align: center;
  color: var(--color-neutral);
}

.all-any-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
  padding: 0.75rem;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;

  span {
    font-size: 0.95rem;
    color: #333;
  }

  select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    font-size: 0.95rem;
    cursor: pointer;

    &:hover {
      border-color: #999;
    }

    &:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
    }
  }
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
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .treemap-chart {
    height: 500px;
    width: 100%;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
}
</style>

