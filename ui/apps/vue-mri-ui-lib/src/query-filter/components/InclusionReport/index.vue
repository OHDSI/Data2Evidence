<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import type { InclusionReportResponse } from '@/query-filter/types/QueryFilterTypes'
import plotly from '@/lib/CustomPlotly'
import { d2eWebapiService } from '@/query-filter/services/D2eWebapiService'
import { computeAttritionStats } from './computeAttritionStats'
import { convertTreemapData } from './computeTreemapStats'
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

const personEventOptions = [
  { value: 'PERSON', label: 'By person' },
  { value: 'EVENT', label: 'By event' },
]
const visualizationOptions = [
  { value: 'ATTRITION', label: 'Attrition' },
  { value: 'INTERSECT', label: 'Intersect' },
]

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
  const colors = ['#fabfb4', '#fcdab6', '#dedcab', '#cdd99e', '#53bead']

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

const renderTreemap = async () => {
  if (!treemapChartRef.value || !treemapData.value) return

  await nextTick()
  console.log('available width', treemapChartRef.value.parentElement, treemapChartRef.value.parentElement.clientWidth)
  avaiableWidth.value = treemapChartRef.value.clientWidth
  // Initialize chart if not already done
  if (!echartsTreemap.value) {
    echartsTreemap.value = echarts.init(treemapChartRef.value)
  }
  console.log('treemapData.value', treemapData.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      show: true,
      formatter: '{b}<br>{e}',
    },
    series: [
      {
        type: 'treemap',
        data: [treemapData.value],
        roam: 'move',
        nodeClick: false,
        breadcrumb: {
          show: false,
        },
      },
    ],
  }

  echartsTreemap.value.setOption(option)
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

// Watch for changes in sourceKey and decide whether to fetch inclusion report
watch(
  () => props.sourceKey,
  newSourceKey => {
    inclusionReportPersonResponse.value = null
    inclusionReportEventResponse.value = null
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

// Watch for visualization changes to resize treemap when switching to INTERSECT view
// watch(
//   () => selectedVisualization.value,
//   async newViz => {
//     if (newViz === 'INTERSECT' && echartsTreemap.value) {
//       // Wait for the element to become visible
//       await nextTick()
//       // Resize the chart to fit the now-visible container
//       echartsTreemap.value.resize()
//     }
//   }
// )
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
    <div class="rules-section">
      <h4>Inclusion Rules</h4>
      <table class="rules-table">
        <thead>
          <tr>
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
            <td>{{ stat.id + 1 }}</td>
            <td class="rule-name">{{ stat.name }}</td>
            <td>{{ stat.countSatisfying.toLocaleString() }}</td>
            <td>{{ stat.percentSatisfying }}</td>
            <td>{{ stat.percentExcluded }}</td>
          </tr>
        </tbody>
      </table>

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
    height: 600px;
    width: 100%;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
}
</style>

