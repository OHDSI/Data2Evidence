<template>
  <div class="custom-container" style="width: 100%; height: 100%">
    <div class="navigation">
      <template v-for="(item, index) in customCharts" :key="index">
        <button
          @click="switchActiveChart(index)"
          class="chartButton"
          v-bind:class="{ selectedChart: index === activeChartIndex }"
        >
          {{ item.chartName }}
        </button>
      </template>
    </div>
    <div class="content">
      <template v-for="(item, index) in customCharts" :key="index">
        <div v-bind:ref="getReferenceName(index)" v-bind:class="{ hidden: index !== activeChartIndex }"></div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
declare var sap
const eventBus = sap.ui.getCore().getEventBus()
import { mapActions, mapGetters } from 'vuex'
import StringToBinary from '../utils/StringToBinary'
import { IFramePlugin } from '../utils/IFramePlugin'

export default {
  name: 'customChart',
  props: ['busyEv'],
  data() {
    return {
      activeChartIndex: -1,
      mriRequest: {
        mriquery: '',
      },
      loadStatus: {},
      mriRequestReadable: {},
    }
  },
  mounted() {
    this.generateMRIRequest()
    this.setupCharts()
    this.updatePatientCount()
  },
  watch: {
    getFireRequest() {
      this.generateMRIRequest()
      this.publishMRIRequest()
      this.updatePatientCount()
    },
  },
  computed: {
    ...mapGetters(['getMriFrontendConfig', 'getFireRequest', 'getBookmarksData']),
    customCharts() {
      return this.getMriFrontendConfig._internalConfig.chartOptions.custom.customCharts
    },
  },
  methods: {
    ...mapActions(['disableAllAxesandProperties', 'firePatientCountQuery']),
    generateMRIRequest() {
      if (this.getBookmarksData && Object.keys(this.getBookmarksData).length > 0) {
        const requestObj = {
          cohortDefinition: {
            ...this.getBookmarksData,
            limit: 100,
            offset: 0,
          },
        }
        this.mriRequestReadable = requestObj
        this.mriRequest = {
          mriquery: StringToBinary(JSON.stringify(requestObj)),
        }
      }
    },
    getReferenceName(index) {
      return `customChart_${index}`
    },
    getHTMLContainer(index) {
      return this.$refs[this.getReferenceName(index)][0]
    },
    setupCharts() {
      this.disableAllAxesandProperties()
      this.$nextTick(() => {
        if (this.customCharts.length > 0) {
          this.switchActiveChart(0)
        }
      })
    },
    switchActiveChart(index) {
      this.activeChartIndex = index
      const chart = this.customCharts[index]
      if (!this.loadStatus.hasOwnProperty(chart.chartName)) {
        const container = this.getHTMLContainer(index)
        try {
          if (chart.vizType === 'component') {
            const customView = new sap.ui.xmlview({
              viewName: chart.chartView,
              width: '100%',
              height: '100%',
            })
            customView.placeAt(container)
            this.$nextTick(() => {
              this.publishMRIRequest()
            })
          }

          if (chart.vizType === 'iframe') {
            const iframePlugin = new IFramePlugin({
              loadFn: this.publishMRIRequest,
              src: chart.chartView,
              name: chart.chartView,
            })
            container.appendChild(iframePlugin.getIFrame())
          }
          this.loadStatus[chart.chartName] = true
        } catch (err) {
          // do nothing
        }
      }
    },
    publishMRIRequest() {
      eventBus.publish('MRI_CUSTOM_CHART_REQUEST', JSON.parse(JSON.stringify(this.mriRequest)))

      if (this.customCharts[this.activeChartIndex] && this.customCharts[this.activeChartIndex].vizType === 'iframe') {
        const container: HTMLElement = this.getHTMLContainer(this.activeChartIndex)
        const iframe: any = container.getElementsByTagName('iframe')[0]
        iframe.MRIPluginInstance.publish('MRIPlugin.onMRIRequest', JSON.parse(JSON.stringify(this.mriRequest)))
        iframe.MRIPluginInstance.publish(
          'MRIPlugin.onMRIRequestDecoded',
          JSON.parse(JSON.stringify(this.mriRequestReadable))
        )
      }
    },
    updatePatientCount() {
      const bm = this.getBookmarksData
      if (bm && Object.keys(bm).length !== 0) {
        const countRequest = { ...bm, guarded: true }
        this.firePatientCountQuery({
          params: JSON.stringify(countRequest),
        })
      }
    },
  },
}
</script>
<style lang="scss">
@import '../styles/_mri-variables.scss';
.error-placeholder {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.error-wrapper {
  background-color: $MriLightestText;
  border-top: 1px solid #e5e5e5;
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.3);
  padding: 6px;
}

.error-message {
  text-align: left;
  margin-bottom: 0px;
}

.icon {
  font-size: 16px;
  margin-top: 0;
  line-height: 18px;
}

.hidden {
  display: none;
}

.custom-container {
  display: flex;
  flex-direction: column;
}

.custom-container .navigation {
  flex: 0;
  background-color: #e5e5e5;
}

.custom-container .navigation .chartButton {
  color: #666666;
  outline: none;
  background: none;
  border: none;
  font-size: 14px;
  line-height: 24px;
  margin-left: 20px;
  width: 100px;
  cursor: pointer;
}

.custom-container .navigation .selectedChart {
  border-bottom: #009de0 4px solid;
}

.custom-container .content {
  flex: 1;
}

.custom-container .content > div {
  height: 100%;
}

.iframe-container {
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
