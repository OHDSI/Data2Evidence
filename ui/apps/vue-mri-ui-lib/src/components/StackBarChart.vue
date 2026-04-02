<template>
  <div class="stackbar-wrapper">
    <div class="stackbar-container" id="stacked-chart"></div>
    <StackBarChartLegend v-if="legendTraces.length > 1" :traces="legendTraces" :colorway="legendColorway" />
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import Plotly from '../lib/CustomPlotly'
import Constants from '../utils/Constants'
import processCSV from '../utils/ProcessCSV'
import { postProcessBarChartData } from './helpers/postProcessBarChartData'
import StackBarChartLegend from './StackBarChartLegend.vue'

let stackBarChart

export default {
  name: 'stackBarChart',
  components: {
    StackBarChartLegend,
  },
  props: ['busyEv', 'shouldRerenderChart'],
  data() {
    return {
      chartData: {} as { traces?: any[]; axisType?: string; categories?: any[]; measures?: any[]; data?: any[] },
      errorMessage: '',
      sbChartStyle: {},
      debounceId: 0,
      layout: { ...Constants.PlotlyConsts.layout, showlegend: false },
      resizeObserver: null,
    }
  },
  created() {
    this.layout = { ...Constants.PlotlyConsts.layout, showlegend: false }
    this.config = Constants.PlotlyConsts.config
    this.setupAxes()
    this.setFireRequest()
  },
  mounted() {
    this.resizeObserver = new ResizeObserver(() => {
      if (stackBarChart && this.chartData && Object.keys(this.chartData).length !== 0) {
        clearTimeout(this.debounceId)
        this.debounceId = setTimeout(() => {
          Plotly.Plots.resize(stackBarChart)
        }, 100)
      }
    })

    if (this.$el) {
      this.resizeObserver.observe(this.$el)
    }
  },
  watch: {
    'sortProperty.props.value': function sorter(newVal) {
      this.chartData = this.processResponse(this.chartData, newVal)
      this.renderChart()
    },
    getChartSize() {
      const pdfSize = this.getChartSize
      const sbChartStyle = {
        width: null,
        height: null,
      }
      if (pdfSize.width) {
        sbChartStyle.width = `${pdfSize.width}px`
      }

      if (pdfSize.height) {
        sbChartStyle.height = `${pdfSize.height}px`
      }

      this.sbChartStyle = sbChartStyle

      this.$nextTick(() => {
        this.renderChart()
        if (pdfSize.width || pdfSize.height) {
          /*
          For Stack Bar Chart, we do not render ourself, so we must
          set timeout...
          */
          setTimeout(() => {
            this.setPdfChartReady(true)
          }, 2000)
        } else {
          this.setPdfChartReady(false)
        }
      })
    },
    getCsvFireDownload() {
      this.downloadCSV({ ...this.getBookmarksData })
        .then(processCSV)
        .catch(() => {
          // do something
        })
        .finally(() => {
          this.completeDownloadCSV()
        })
    },
    getFireRequest() {
      // Skip if fire requests are being held (during batch updates like applying required filters)
      if (this.isFireRequestHeld) {
        return
      }

      // Check if the chart has been reset
      const chartSortProperty = this.getChartProperty(Constants.MRIChartProperties.Sort)
      if (chartSortProperty?.props?.active === false) {
        this.setupAxes()
      }

      this.$emit('busyEv', true)
      const bookmark = this.getBookmarksData
      if (Object.keys(bookmark).length !== 0 && bookmark) {
        const callback = response => {
          const chartData = postProcessBarChartData(response)
          this.chartData = this.processResponse(chartData)
          this.setCurrentPatientCount({
            currentPatientCount: this.chartData.totalPatientCount,
          })
          if (stackBarChart) {
            Plotly.purge(stackBarChart)
          }
          this.setupPlotly()
          this.$emit('busyEv', false)

          if (this.chartData.hasOwnProperty('noDataReason')) {
            this.setCurrentPatientCount({
              currentPatientCount: '--',
            })

            if (this.chartData.noDataReason === this.getText('MRI_PA_NO_MATCHING_PATIENTS')) {
              this.setAlertMessage({
                messageType: 'info',
                message: this.chartData.noDataReason,
              })
            } else {
              this.setAlertMessage({
                message: this.chartData.noDataReason,
              })
            }
            return
          }

          this.renderChart()
        }

        this.fireQuery({
          url: '/analytics-svc/api/services/population/json/barchart',
          params: { mriquery: JSON.stringify(this.getBookmarksData), datasetId: this.getBookmarksData.datasetId },
        })
          .then(callback)
          .catch(error => {
            const { message, response, code } = error

            if (message !== 'cancel') {
              this.$emit('busyEv', false)
            }

            let noDataReason = this.getText('MRI_PA_CHART_NO_DATA_DEFAULT_MESSAGE')

            if (code === 'ECONNABORTED') {
              // Handle timeout explicitly
              callback({
                data: [],
                measures: [],
                categories: [],
                totalPatientCount: 0,
                noDataReason,
              })
              return
            }

            if (response) {
              // For all handled errors from backend
              if (response.status === 500) {
                noDataReason = response.data.errorMessage || response.data.err
                if (response.data.errorType === 'MRILoggedError') {
                  noDataReason = this.getText('MRI_DB_LOGGED_MESSAGE', response.data.logId)
                }
              }

              callback({
                data: [],
                measures: [],
                categories: [],
                totalPatientCount: 0,
                noDataReason,
              })
            }
          })
      }
    },
    shouldRerenderChart() {
      if (this.shouldRerenderChart) {
        if (stackBarChart) {
          Plotly.purge(stackBarChart)
        }
        this.setupPlotly()
        this.renderChart()
      }
    },
  },
  computed: {
    ...mapGetters([
      'dataToTraces',
      'getMriFrontendConfig',
      'getChartSize',
      'getCsvFireDownload',
      'getText',
      'getFireRequest',
      'isFireRequestHeld',
      'getHasAssignedConfig',
      'getBookmarksData',
      'getChartableFilterCardByInstanceId',
      'sortProperty',
      'processResponse',
      'getChartProperty',
    ]),

    legendTraces() {
      if (this.chartData?.colorLegend?.length > 0) {
        return this.chartData.colorLegend.map(item => ({
          name: item.name,
          meta: { fullName: item.name },
        }))
      }
      return this.chartData?.traces || []
    },
    legendColorway() {
      if (this.chartData?.colorLegend?.length > 0) {
        return this.chartData.colorLegend.map(item => item.color)
      }
      return Object.values(Constants.ChartColorway)
    },
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    if (stackBarChart) {
      Plotly.purge(stackBarChart)
    }
  },
  methods: {
    ...mapActions([
      'setAxisValue',
      'setChartPropertyValue',
      'fireQuery',
      'disableAllAxesandProperties',
      'setChartSelection',
      'setPdfChartReady',
      'downloadCSV',
      'setCurrentPatientCount',
      'setFireRequest',
      'completeDownloadCSV',
      'setAlertMessage',
      'setPlotlyElement',
    ]),
    /**
     * Returns true when x-axis labels should be truncated.
     * Heuristic: estimate available chars per slot based on plot width,
     * and compare against the average label length.
     * Falls back to always-truncate when width is unknown.
     */
    shouldTruncateXAxisLabels(plotWidth: number, categoryCount: number, avgLabelLength: number): boolean {
      if (!plotWidth || !categoryCount) return true
      const charsPerSlot = plotWidth / categoryCount / 7
      return avgLabelLength > charsPerSlot * 0.9
    },
    /**
     * Builds the xaxis tick overrides to apply to a Plotly layout object.
     * Chooses full or truncated ticktext based on available space heuristic.
     */
    buildXAxisTicks() {
      if (!this.chartData || !this.chartData.tickvals) return null
      const tickvals: string[] = this.chartData.tickvals
      const ticktextFull: string[] = this.chartData.ticktextFull || tickvals
      const ticktext: string[] = this.chartData.ticktext || tickvals
      const categoryCount = tickvals.length
      // Measure plot width from DOM element if available
      const plotWidth = stackBarChart ? stackBarChart.clientWidth : 0
      // Compute average label length from full labels
      const avgLabelLength = ticktextFull.reduce((sum, t) => sum + t.length, 0) / (ticktextFull.length || 1)
      const useTruncated = this.shouldTruncateXAxisLabels(plotWidth, categoryCount, avgLabelLength)
      return {
        tickvals,
        ticktext: useTruncated ? ticktext : ticktextFull,
        tickangle: useTruncated ? 'auto' : 0,
      }
    },
    setupAxes() {
      this.disableAllAxesandProperties()
      this.setChartPropertyValue({
        id: Constants.MRIChartProperties.Sort,
        props: {
          layoutLeft: '0px',
          layoutTop: '31px',
          layoutBottom: '',
          icon: '',
          iconFamily: 'app-icons',
          active: true,
        },
      })
      this.setAxisValue({
        id: Constants.MRIChartDimensions.StackAttribute,
        props: {
          layoutLeft: '0px',
          layoutTop: '150px',
          layoutBottom: '',
          icon: '',
          iconFamily: 'app-icons',
          isCategory: true,
          isMeasure: false,
          active: true,
        },
      })
      this.setAxisValue({
        id: Constants.MRIChartDimensions.Y,
        props: {
          layoutLeft: '0px',
          layoutTop: '108px',
          layoutBottom: '',
          icon: '',
          iconFamily: 'app-MRI-icons',
          isCategory: false,
          isMeasure: true,
          active: true,
        },
      })
      const iLevelHeight = 41
      for (let i = 0; i <= Constants.MRIChartDimensions.X2; i += 1) {
        this.setAxisValue({
          id: i,
          props: {
            layoutLeft: '0px',
            layoutTop: '',
            layoutBottom: `${20 + i * iLevelHeight}px`,
            icon: { 0: '', 1: '', 2: '' }[i],
            iconFamily: 'app-MRI-icons',
            isCategory: true,
            isMeasure: false,
            active: true,
          },
        })
      }
    },
    renderChart() {
      if (this.chartData && Object.keys(this.chartData).length !== 0) {
        const data = JSON.parse(JSON.stringify(this.chartData))
        data.categories.forEach(category => {
          if (category.id !== 'dummy_category') {
            const filterCardPath = category.id.split('.')
            filterCardPath.pop()
            filterCardPath.pop()
            if (filterCardPath.length <= 1) {
              const defaultTitle = this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
              // Only add prefix if it's not already there to prevent duplicate prefixes
              if (!category.name || !category.name.startsWith(defaultTitle + ' - ')) {
                category.name = `${defaultTitle} - ${category.name}`
              }
            } else {
              const filterCard = this.getChartableFilterCardByInstanceId(filterCardPath.join('.'))
              if (!category.name || !category.name.startsWith(filterCard.name + ' - ')) {
                category.name = `${filterCard.name} - ${category.name}`
              }
            }
          }
        })

        this.chartData = this.dataToTraces(data)

        const freshLayout = JSON.parse(JSON.stringify(Constants.PlotlyConsts.layout))
        freshLayout.showlegend = false
        freshLayout.xaxis.type = this.chartData.axisType
        const xTicks = this.buildXAxisTicks()
        if (xTicks) {
          freshLayout.xaxis.tickvals = xTicks.tickvals
          freshLayout.xaxis.ticktext = xTicks.ticktext
          freshLayout.xaxis.tickangle = xTicks.tickangle
        }

        Plotly.react(stackBarChart, this.chartData.traces, freshLayout, this.config)

        // Resize chart after DOM updates to account for legend space
        this.$nextTick(() => {
          Plotly.Plots.resize(stackBarChart)
        })
      }
    },
    setupPlotly() {
      stackBarChart = this.$el.querySelector('.stackbar-container')

      const initialLayout = JSON.parse(JSON.stringify(Constants.PlotlyConsts.layout))
      initialLayout.showlegend = false
      initialLayout.xaxis.type = this.chartData.axisType
      const initialXTicks = this.buildXAxisTicks()
      if (initialXTicks) {
        initialLayout.xaxis.tickvals = initialXTicks.tickvals
        initialLayout.xaxis.ticktext = initialXTicks.ticktext
        initialLayout.xaxis.tickangle = initialXTicks.tickangle
      }

      Plotly.newPlot(stackBarChart, this.chartData.traces, initialLayout, this.config)

      // Resize chart after DOM updates to account for legend space
      this.$nextTick(() => {
        Plotly.Plots.resize(stackBarChart)
      })

      const selectionUpdate = () => {
        // Update selection in state to activate drilldown
        const selectedData = []
        let selectedCount = 0
        const pushPoint = (dataId, dataValue) => {
          selectedData.push({ id: dataId, value: dataValue })
        }
        this.chartData.traces.forEach(trace => {
          if (!trace.selectedpoints) {
            return
          }
          trace.selectedpoints.forEach(pointIndex => {
            const pointCustomData = trace.customdata[pointIndex]
            const xAxes = pointCustomData.x
            const yAxis = pointCustomData.y

            xAxes.forEach((xAxis, axisIndex) => {
              // Use the canonical plotted value from trace.x (full, untruncated)
              let canonicalValue: string
              if (Array.isArray(trace.x[0])) {
                // multicategory: trace.x is an array-of-arrays
                canonicalValue = String(trace.x[axisIndex][pointIndex])
              } else {
                // single axis
                canonicalValue = String(trace.x[pointIndex])
              }
              pushPoint(xAxis.id, canonicalValue)
            })
            if (yAxis.length > 0) {
              pushPoint(yAxis[0].id, trace.meta ? trace.meta.fullName : trace.name)
            }
            selectedCount++
          })
        })
        this.setChartSelection({ selection: selectedData })

        // Persist selection across Plotly react
        const selectedPoints = this.chartData.traces.map(trace => trace.selectedpoints)
        this.dataToTraces(this.chartData, selectedPoints, selectedCount)

        stackBarChart.removeAllListeners('plotly_selected')
        stackBarChart.removeAllListeners('plotly_deselect')

        const selectionLayout = JSON.parse(JSON.stringify(Constants.PlotlyConsts.layout))
        selectionLayout.showlegend = false
        selectionLayout.xaxis.type = this.chartData.axisType
        const selectionXTicks = this.buildXAxisTicks()
        if (selectionXTicks) {
          selectionLayout.xaxis.tickvals = selectionXTicks.tickvals
          selectionLayout.xaxis.ticktext = selectionXTicks.ticktext
          selectionLayout.xaxis.tickangle = selectionXTicks.tickangle
        }
        Plotly.react(stackBarChart, this.chartData.traces, selectionLayout, this.config)
      }

      stackBarChart.on('plotly_selected', selectionUpdate)
      stackBarChart.on('plotly_deselect', selectionUpdate)
      this.setPlotlyElement({ element: stackBarChart })
    },
  },
}
</script>

<style scoped>
.stackbar-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 8px;
}
.stackbar-container {
  flex: 1;
  min-width: 0;
  height: 100%;
}
</style>
