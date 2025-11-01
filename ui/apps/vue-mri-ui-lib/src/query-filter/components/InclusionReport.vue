<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { InclusionReportResponse } from '@/query-filter/types/ConceptSetTypes'
import plotly from '@/lib/CustomPlotly'

const props = defineProps<{
  cohortDefinitionId: number
  sourceKey: string
  modeId?: number
  patientCount: number | null
  generationStatus: 'idle' | 'pending' | 'complete' | 'failed'
}>()

const isLoadingInclusionReport = ref<boolean>(false)
const inclusionReportResponse = ref<InclusionReportResponse | null>(null)

const hasCohortGenerated = computed(() => {
  return props.patientCount !== null
})

const shouldFetchInclusionReport = computed(() => {
  return props.patientCount !== null && !(props.generationStatus === 'pending' || props.generationStatus === 'failed')
})

// Helper function to count matches in treemap data
const countMatch = (node: any, mask: string): number => {
  let count = 0
  if (node.hasOwnProperty('children')) {
    node.children.forEach((c: any) => {
      count += countMatch(c, mask)
    })
  } else {
    count = node.name.startsWith(mask) ? node.size : 0
  }
  return count
}

// Compute attrition statistics from treemap data
const attritionStats = computed(() => {
  if (!inclusionReportResponse.value) return []

  const report = inclusionReportResponse.value
  const treemapData = JSON.parse(report.treemapData)
  const baseCount = report.summary.baseCount

  let priorPct = 1.0
  const stats = report.inclusionRuleStats.map((rule: any, i: number) => {
    const countSatisfying = countMatch(treemapData, '1'.repeat(i + 1))
    const percentSatisfying = baseCount !== 0 ? countSatisfying / baseCount : 0
    const pctDiff = priorPct - percentSatisfying
    priorPct = percentSatisfying

    return {
      id: rule.id,
      name: rule.name,
      countSatisfying,
      percentSatisfying: (percentSatisfying * 100).toFixed(2) + '%',
      pctDiff: (pctDiff * 100).toFixed(2) + '%',
    }
  })

  return stats
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
    labels.push(`${stat.id} - ${name}`)
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

const funnelChartLayout = computed(() => ({
  height: 800,
  // margin: { r: 20 },
  yaxis: { automargin: true },
  xaxis: { automargin: true },
}))

const funnelChartConfig = computed(() => ({
  responsive: true,
  displayModeBar: true,
}))

const funnelChartRef = ref<HTMLElement | null>(null)

const renderFunnelChart = () => {
  if (!funnelChartRef.value || !funnelChartData.value) return

  const trace = {
    type: 'funnel',
    y: funnelChartData.value.labels,
    x: funnelChartData.value.values,
    text: funnelChartData.value.hoverTexts,
    hoverinfo: 'text',
    textposition: 'inside',
    constraintext: 'outside',
    textinfo: 'value+percent initial',
    marker: {
      color: 'rgba(31, 119, 180, 0.7)',
    },
  }

  plotly.newPlot(funnelChartRef.value, [trace], funnelChartLayout.value, funnelChartConfig.value)
}

watch(
  () => props.sourceKey,
  newSourceKey => {
    fetchInclusionReport(props.cohortDefinitionId, newSourceKey, props.modeId)
  }
)

const fetchInclusionReport = async (cohortDefinitionId: number, sourceKey: string, modeId: number) => {
  isLoadingInclusionReport.value = true
  try {
    if (!modeId) modeId = 1
    // inclusionReportResponse.value = await d2eWebapiService.getInclusionReport(cohortDefinitionId, sourceKey, modeId)
    // mock data
    inclusionReportResponse.value = {
      summary: {
        baseCount: 4035,
        finalCount: 23,
        lostCount: 0,
        percentMatched: '0.57%',
      },
      inclusionRuleStats: [
        {
          id: 0,
          name: 'Cancer surgery within 30 days before dx and no radio- or systemic treatment before surgery',
          percentExcluded: '40.45%',
          percentSatisfying: '1.36%',
          countSatisfying: 55,
        },
        {
          id: 1,
          name: 'no other malignancies ',
          percentExcluded: '0.79%',
          percentSatisfying: '41.02%',
          countSatisfying: 1655,
        },
      ],
      treemapData:
        '{"name" : "Everyone", "children" : [{"name" : "Group 2", "children" : [{"name": "11", "size": 23},{"name" : "Group 1", "children" : [{"name": "01", "size": 1632},{"name": "10", "size": 32},{"name" : "Group 0", "children" : [{"name": "00", "size": 2348}]}]}]}]}',
    }
  } catch (error) {
    console.error('Error fetching inclusion report:', error)
  } finally {
    isLoadingInclusionReport.value = false
  }
}

onMounted(() => {
  fetchInclusionReport(props.cohortDefinitionId, props.sourceKey, props.modeId)
})

watch(
  () => funnelChartData.value,
  () => {
    console.log('funnelChartData changed, rendering funnel chart...')
    // Ensure the DOM has updated and the <div ref="funnelChartRef"> exists
    // by running this watcher after component updates (flush: 'post').
    renderFunnelChart()
  },
  { flush: 'post' }
)

// const data = [
//   {
//     type: 'funnel',
//     y: ['Website visit', 'Downloads', 'Potential customers', 'Invoice sent', 'Closed delas'],
//     x: [13873, 10533, 5443, 2703, 908],
//     hoverinfo: 'x+percent previous+percent initial',
//   },
// ]
// const layout = { margin: { l: 150 }, width: 600, height: 500 }
// onMounted(() => {
//   plotly.newPlot(funnelChartRef.value, data, layout)
// })
</script>

<template>
  <slot />

  <div v-if="isLoadingInclusionReport" class="loading">Loading inclusion report...</div>

  <div v-else-if="inclusionReportResponse" class="inclusion-report-container">
    <p>using 1 event per person</p>
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
            <th>% remain</th>
            <!-- percent excluded -->
            <th>% diff</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stat in attritionStats" :key="stat.id">
            <td>{{ stat.id }}</td>
            <td>{{ stat.name }}</td>
            <td>{{ stat.countSatisfying.toLocaleString() }}</td>
            <td>{{ stat.percentSatisfying }}</td>
            <td>{{ stat.pctDiff }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Plotly Funnel chart -->
      <div class="funnel-chart-section">
        <h4>Inclusion Funnel</h4>
        <div ref="funnelChartRef" class="funnel-chart"></div>
      </div>
    </div>
  </div>

  <div v-else class="no-data">No inclusion report data available</div>
</template>

<style scoped>
.inclusion-report-container {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
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
  font-size: 0.9rem;
}

.summary-table thead,
.rules-table thead {
  background-color: #f5f5f5;
}

.summary-table th,
.rules-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
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

.loading,
.no-data {
  padding: 2rem;
  text-align: center;
  color: #999;
}

.funnel-chart-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.funnel-chart {
  width: 100%;
  height: fit-content;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>

