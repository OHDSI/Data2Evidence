<template>
  <div class="stackbar-wrapper">
    <div class="stackbar-container" id="stacked-chart"></div>
    <StackBarChartLegend
      v-if="chartData.traces && chartData.traces.length > 1"
      :traces="chartData.traces"
      :colorway="chartColorway"
    />
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import Plotly from '../lib/CustomPlotly'
import Constants from '../utils/Constants'
import processCSV from '../utils/ProcessCSV'
import { postProcessBarChartData } from './helpers/postProcessBarChartData'
import StackBarChartLegend from './StackBarChartLegend.vue'
import { init } from 'echarts'
import { initial } from 'underscore'

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
    // Dynamically select colorway based on number of traces
    chartColorway() {
      const numTraces = this.chartData?.traces?.length || 0

      if (numTraces === 2) {
        // High contrast palette for binary comparisons
        return ['#000080', '#F79409FF']
      } else if (numTraces === 3) {
        return ['#000080', '#3E92E0FF', '#F79409FF']
      } else if (numTraces === 4) {
        return ['#000080', '#3E92E0FF', '#FCD34BFF', '#F79409FF']
      } else {
        // Full palette for 5+ traces
        // return ['#000080', '#144187', '#23718c', '#529f70', '#8bcb48', '#fee727'] // ggplot color in stackoverflow
        // return ['#000080', '#5d2085', '#9e3688', '#de4b8b', '#EC6E41', '#f5c747'] // option 1
        // return ['#000080', '#9e3688', '#de4b8b', '#EC6E41', '#f5c747'] // option 1
        // return ['#000080', '#540982', '#821d80', '#ab3478', '#d04d64', '#eb7100'] // option 2
        // return ['#000080', '#FB9F9D', '#196D76', '#FFD9A5'] // option 3
        // return ['#000080', '#FB9F9D', '#196D76', '#D4820A'] // option 3 with amber
        // return ['#007FFFFF', '#4CC3FFFF', '#99EDFFFF', '#CCFFFFFF', '#FFFFCCFF', '#FFEE99FF', '#FFC34CFF', '#FF7F00FF']
        // return ['#F56455FF', '#000080', '#87C785FF', '#572F30FF'] // r color palette
        // return ['#6BBAE5FF', '#E3EEF4FF', '#000080', '#F9F5EAFF', '#81974CFF', '#553F31FF'] // r color palette 2
        // return ['#000080', '#6DAABDFF', '#CAECB3FF', '#F3CB04FF', '#E28027FF']
        // return ['#000080', '#3e92e0', '#c0ced1', '#fcd34b', '#f79409'] // colorblind safe, passes WCAG AA contrast requirement, with outline #595757
        return ['#000080', '#f79409', '#3e92e0', '#FB9F9D', '#fcd34b'] // most recommended by leandro and Karthik
        // return ['#56B4E9', '#0072B2', '#CC79A7', '#009E73', '#E69F00'] // not colorblind safe
        // return ['#56B4E9', '#009E73', '#D55E00', '#CC79A7', '#E69F00']
        // return ['#0072B2', '#F0E442', '#009E73', '#56B4E9', '#E69F00'] // okabe-ito
        // return ['#E69F00', '#56B4E9', '#009E73', '#0072B2', '#D55E00', '#CC79A7'] // okabe-ito 2
        // return [
        //   '#212E52FF',
        //   '#444E7EFF',
        //   '#8087AAFF',
        //   '#B7ABBCFF',
        //   '#F9ECE8FF',
        //   '#FCC893FF',
        //   '#FEB424FF',
        //   '#FD8700FF',
        //   '#D8511DFF',
        // ]
        // return [
        //   '#FDA2A2',
        //   '#000E7E',
        //   '#A2FDCD',
        //   '#FF5E59',
        //   '#CCDEF1',
        //   '#2599A7',
        //   '#FFC4AD',
        //   '#999FCB',
        //   '#EBF0C8',
        //   '#CE7AEB',
        //   '#69BBF6',
        //   '#FDEEA2',
        //   '#9215BC',
        //   '#9FC5E8',
        //   '#FFD9A5',
        // ] // original
      }
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
        freshLayout.colorway = this.chartColorway

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
      initialLayout.colorway = this.chartColorway

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

            if (xAxes.length > 1) {
              xAxes.forEach((xAxis, axisIndex) => {
                pushPoint(xAxis.id, trace.x[axisIndex][pointIndex])
              })
            } else if (xAxes.length === 1) {
              pushPoint(xAxes[0].id, trace.x[pointIndex])
            }
            if (yAxis.length > 0) {
              pushPoint(yAxis[0].id, trace.name)
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
        selectionLayout.colorway = this.chartColorway
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
