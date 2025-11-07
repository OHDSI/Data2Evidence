<template>
  <div class="stackbar-container" id="columnbar-chart" style="width: 100%; height: 100%">
    <chartErrorMessage :errorMessage="errorMessage"></chartErrorMessage>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import axios from 'axios'
import Plotly from '../lib/CustomPlotly'
import chartErrorMessage from './ChartErrorMessage.vue'
import Constants from '../utils/Constants'

let barCompareChart

const CancelToken = axios.CancelToken
let cancel

export default {
  name: 'StackBarCohortCompare',
  props: ['busyEv', 'bookmarkList', 'xAxes', 'yAxis', 'sortOrder', 'setUpperAxisEv', 'setLowerAxisEv'],
  data() {
    return {
      errorMessage: '',
      sbChartStyle: {},
      debounceId: 0,
      bookmarks: this.bookmarkList,
      chartData: {},
      selectedAxis: {
        x: {},
        y: {},
      },
    }
  },
  mounted() {
    this.setUpSelectedAxis()
    this.layout = Constants.PlotlyConsts.layout
    this.config = Constants.PlotlyConsts.config
    if (barCompareChart) {
      Plotly.purge(barCompareChart)
    }
    this.fireCompareRequest()
  },
  beforeDestroy() {
    if (barCompareChart) {
      Plotly.purge(barCompareChart)
    }
  },
  watch: {
    yAxis() {
      this.fireCompareRequest()
    },
    xAxes() {
      this.fireCompareRequest()
    },
    sortOrder() {
      this.renderChart()
    },
  },
  computed: {
    ...mapGetters(['dataToTraces', 'getMriFrontendConfig', 'getText', 'processResponse', 'getSelectedDataset']),
  },
  methods: {
    ...mapActions(['ajaxAuth']),
    setUpSelectedAxis() {
      const config = this.getMriFrontendConfig
      const axes = [
        { name: 'x', val: this.xAxes },
        { name: 'y', val: this.yAxis },
      ]
      axes.forEach(axis => {
        if (axis.val) {
          const filterCardName = config.getFilterCardByPath(config.getAttributeByPath(axis.val).sParentPath)
            .oInternalConfigFilterCard.name
            ? config.getFilterCardByPath(config.getAttributeByPath(axis.val).sParentPath).oInternalConfigFilterCard.name
            : this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
          const attributeName = config.getAttributeByPath(axis.val).oInternalConfigAttribute.name
          this.selectedAxis[axis.name].axisPropertyText = filterCardName
          this.selectedAxis[axis.name].axisAttrText = attributeName
          this.selectedAxis[axis.name].axisPropertyTooltip = filterCardName + ' - ' + attributeName
        } else {
          this.selectedAxis[axis.name].axisPropertyText = this.getText('MRI_PA_CHART_AXIS_PLACEHOLDER')
          this.selectedAxis[axis.name].axisAttrText = ''
          this.selectedAxis[axis.name].axisPropertyTooltip = ''
        }
      })
      this.getUpperAxisProperties()
      this.getLowerAxisProperties()
    },
    fireCompareRequest() {
      const configMetadata = this.getMriFrontendConfig.getConfigMetadata()
      this.$emit('busyEv', true)
      const cancelToken = new CancelToken(c => {
        cancel = c
      })

      this.ajaxAuth({
        method: 'get',
        url:
          '/analytics-svc/api/services/patient/cohorts/compare/barchart?' +
          'ids=' +
          this.bookmarks.map(e => e.id).join(',') +
          '&xaxis=' +
          this.xAxes +
          '&yaxis=' +
          this.yAxis +
          '&configId=' +
          configMetadata.configId +
          '&configVersion=' +
          configMetadata.configVersion +
          '&datasetId=' +
          this.getSelectedDataset.id,
        cancelToken,
      })
        .then(({ data }) => {
          this.chartData = this.processResponse(data)
          this.setupPlotly()
          this.renderChart()
          this.$emit('busyEv', false)
        })
        .catch(({ message, response }) => {
          if (barCompareChart) {
            Plotly.purge(barCompareChart)
            barCompareChart = null
          }
          let noDataReason = this.getText('MRI_PA_CHART_NO_DATA_DEFAULT_MESSAGE')

          if (response) {
            // For all handled errors from backend
            if (response.status === 500) {
              noDataReason = response.data.errorMessage
              if (response.data.errorType === 'MRILoggedError') {
                noDataReason = this.getText('MRI_DB_LOGGED_MESSAGE', response.data.logId)
              }
            }
          }

          this.errorMessage = noDataReason
          if (message !== 'cancel') {
            this.$emit('busyEv', false)
          }
        })
    },
    setupPlotly() {
      barCompareChart = this.$el
      Plotly.newPlot(barCompareChart, this.chartData.traces, this.layout, this.config)
    },
    renderChart() {
      const data = JSON.parse(JSON.stringify(this.chartData))
      data.categories.forEach(category => {
        if (category.id && category.id !== 'cohortId') {
          const sParent = this.getMriFrontendConfig.getAttributeByPath(category.id).sParentPath
          let filterCardName = ''
          if (sParent === 'patient') {
            filterCardName = this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
          } else {
            filterCardName = this.getMriFrontendConfig.getFilterCardByPath(sParent).getName()
          }
          category.name = `${filterCardName} - ${this.getMriFrontendConfig.getAttributeByPath(category.id).getName()}`
        } else {
          category.name = this.getText('MRI_PA_VIEW_COHORT_TITLE')
          category.id = 'cohortName' // Use saved name for bar label
        }
      })

      // add name of bookmark id to bookmark name in data
      data.data.forEach(d => {
        this.bookmarks.forEach(bookmark => {
          if (bookmark.id === d.cohortId) {
            d.cohortName = bookmark.name
          }
        })
      })

      this.chartData = this.dataToTraces(data)
      this.layout.xaxis.type = this.chartData.axisType
      Plotly.react(barCompareChart, this.chartData.traces, this.layout, this.config)
    },
    getLowerAxisProperties() {
      //     this.setUpSelectedAxis();
      const xAxisProperties = [
        {
          chart: 'bar',
          type: 'x',
          order: 0,
          layoutLeft: 0,
          layoutTop: 0,
          layoutBottom: 60,
          icon: '',
          iconFamily: 'app-MRI-icons',
          active: true,
          isCategory: true,
          isMeasure: false,
          axisPropertyTooltip: this.selectedAxis.x.axisPropertyTooltip,
          axisPropertyText: this.selectedAxis.x.axisPropertyText,
          axisAttrText: this.selectedAxis.x.axisAttrText,
        },
      ]
      this.$emit('setLowerAxisEv', xAxisProperties)
      return xAxisProperties
    },
    getUpperAxisProperties() {
      //  this.setUpSelectedAxis();
      const upperAxisProperties = [
        {
          chart: 'bar',
          type: 'y',
          order: 0,
          icon: '',
          iconFamily: 'app-MRI-icons',
          isCategory: false,
          isMeasure: true,
          active: true,
          layoutLeft: 0,
          layoutTop: 185,
          layoutBottom: 0,
          axisPropertyTooltip: this.selectedAxis.y.axisPropertyTooltip,
          axisPropertyText: this.selectedAxis.y.axisPropertyText,
          axisAttrText: this.selectedAxis.y.axisAttrText,
        },
      ]
      this.$emit('setUpperAxisEv', upperAxisProperties)
      return upperAxisProperties
    },
  },
  components: {
    chartErrorMessage,
  },
}
</script>
