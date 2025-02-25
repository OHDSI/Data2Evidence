<template>
  <div class="stackbar-container" id="stacked-chart" style="width: 100%; height: 100%"></div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import Plotly from '../lib/CustomPlotly'
import Constants from '../utils/Constants'
import processCSV from '../utils/ProcessCSV'
import { postProcessBarChartData } from './helpers/postProcessBarChartData'

let stackBarChart

export default {
  name: 'stackBarChart',
  props: ['busyEv', 'shouldRerenderChart'],
  data() {
    return {
      chartData: {},
      errorMessage: '',
      sbChartStyle: {},
      debounceId: 0,
    }
  },
  created() {
    this.layout = Constants.PlotlyConsts.layout
    this.config = Constants.PlotlyConsts.config
    this.setupAxes()
    this.setFireRequest()
  },
  watch: {
    getHasAssignedConfig(hasAssignedConfig) {
      if (hasAssignedConfig) {
        this.setupAxes()
        this.setFireRequest()
      }
    },
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
            this.setAlertMessage({
              message: this.chartData.noDataReason,
            })
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
              });
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
      'getHasAssignedConfig',
      'getBookmarksData',
      'getChartableFilterCardByInstanceId',
      'sortProperty',
      'processResponse',
    ]),
  },
  beforeDestroy() {
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
              category.name = `${defaultTitle} - ${category.name}`
            } else {
              const filterCard = this.getChartableFilterCardByInstanceId(filterCardPath.join('.'))
              category.name = `${filterCard.name} - ${category.name}`
            }
          }
        })

        this.chartData = this.dataToTraces(data)
        this.layout.xaxis.type = this.chartData.axisType
        Plotly.react(stackBarChart, this.chartData.traces, this.layout, this.config)
      }
    },
    setupPlotly() {
      stackBarChart = this.$el
      Plotly.newPlot(stackBarChart, this.chartData.traces, this.layout, this.config)

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
          const xAxes = trace.customdata.x
          const yAxis = trace.customdata.y
          trace.selectedpoints.forEach(pointIndex => {
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
        Plotly.react(stackBarChart, this.chartData.traces, this.layout, this.config)
      }

      stackBarChart.on('plotly_selected', selectionUpdate)
      stackBarChart.on('plotly_deselect', selectionUpdate)
      this.setPlotlyElement({ element: stackBarChart })
    },
  },
}
</script>
