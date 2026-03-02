import { ref, computed, watch, type Ref } from 'vue'
import plotly from '@/lib/CustomPlotly'
import { COLORS_ARRAY, FUNNEL_THRESHOLDS, FUNNEL_LEGEND_LABELS } from '../constants'
import type { InclusionReportResponse } from '@/query-filter/types/InclusionReportTypes'

export interface FunnelChartData {
  labels: string[]
  values: number[]
  hoverTexts: string[]
}

export interface AttritionStat {
  id: number
  name: string
  countSatisfying: number
  percentSatisfying: string
  pctDiff: string
}

export function useFunnelChart(
  inclusionReportResponse: Ref<InclusionReportResponse | null>,
  draggableAttritionStats: Ref<AttritionStat[]>
) {
  const funnelChartRef = ref<HTMLElement | null>(null)

  const funnelChartData = computed<FunnelChartData | null>(() => {
    if (!inclusionReportResponse.value || draggableAttritionStats.value.length === 0) return null

    const summary = inclusionReportResponse.value.summary
    const stats = draggableAttritionStats.value

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

    return { labels, values, hoverTexts }
  })

  const renderFunnelChart = () => {
    if (!funnelChartRef.value || !funnelChartData.value) return

    // Compute ratios relative to previous layer
    const ratios = funnelChartData.value.values.map((v, i) => (i === 0 ? 1 : v / funnelChartData.value!.values[i - 1]))

    // Map each ratio to a color based on thresholds
    const layerColors = ratios.map(ratio => {
      for (let i = 0; i < FUNNEL_THRESHOLDS.length; i++) {
        if (ratio <= FUNNEL_THRESHOLDS[i]) return COLORS_ARRAY[i]
      }
      return COLORS_ARRAY[COLORS_ARRAY.length - 1]
    })

    const trace = {
      type: 'funnel',
      y: funnelChartData.value.labels,
      x: funnelChartData.value.values,
      text: funnelChartData.value.hoverTexts,
      hoverinfo: 'text',
      textposition: 'inside',
      texttemplate: 'N: %{x}<br> % remain: %{percentInitial:.2%}',
      constraintext: 'outside',
      textinfo: 'value+percent initial',
      marker: {
        color: layerColors,
      },
      hoverlabel: {
        bgcolor: '#f9f9f9', // css var doesn't work here
      },
      showlegend: false, // Hide legend for main trace
    }

    // Create dummy traces for legend - only for colors actually used
    const usedColors = new Set(layerColors)
    const legendTraces = COLORS_ARRAY.map((color, index) => ({
      type: 'scatter',
      x: [null],
      y: [null],
      mode: 'markers',
      marker: {
        size: 10,
        color: color,
      },
      name: FUNNEL_LEGEND_LABELS[index],
      showlegend: true,
    })).filter((_trace, index) => usedColors.has(COLORS_ARRAY[index]))

    const layout = {
      height: 800,
      yaxis: {
        automargin: true,
        autorange: 'reversed',
        showgrid: false,
        zeroline: false,
      },
      xaxis: {
        automargin: true,
        showgrid: false,
        showline: false,
        showticklabels: false,
        zeroline: false,
      },
      showlegend: true,
      legend: {
        orientation: 'v',
        x: 1.02,
        y: 1,
        xanchor: 'left',
        yanchor: 'top',
      },
    }

    const chartConfig = {
      responsive: true,
      displayModeBar: false,
    }

    plotly.newPlot(funnelChartRef.value, [trace, ...legendTraces], layout, chartConfig)
  }

  // Watch for changes in funnelChartData to render funnel chart
  watch(
    () => funnelChartData.value,
    () => {
      renderFunnelChart()
    },
    { flush: 'post' } // Ensure <div ref="funnelChartRef"> exists
  )

  return {
    funnelChartRef,
  }
}
