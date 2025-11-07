<template>
  <messageBox v-if="getDisplaySharedChart" dim="true" @close="close" messageType="custom" :busy="chartBusy">
    <template v-slot:header>Federated Query Comparison Chart</template>
    <template v-slot:body>
      <div class="flex-spacer">
        <div style="padding: 30px 30px 30px 30px">
          <div class="body-container label-for">
            <div ref="chart" class="shared-container" id="shared-chart" v-bind:style="sharedChartStyle" />
          </div>
        </div>
      </div>
    </template>
    <template v-slot:footer>
      <div class="flex-spacer"></div>
      <appButton
        :click="fireMyQuery"
        text="Run in My System"
        :disabled="!allChartDataLoaded || queryExecuted || chartBusy"
        v-focus
      ></appButton>
      <appButton :click="shareBookmarkEntry" :text="getSharingText" :disabled="!queryExecuted"></appButton>
      <appButton :click="close" :text="getText('MRI_PA_KAPLAN_CURVE_ANA_POPUP_BUT_CLOSE')"></appButton>
    </template>
  </messageBox>
</template>

<script lang="ts">
declare var sap
import { mapActions, mapGetters } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import AnnotateBM from '../utils/AnnotateBM'
import { postProcessBarChartData } from './helpers/postProcessBarChartData'
import MessageBox from './MessageBox.vue'

let sharedChart
let sharedChartController

export default {
  name: 'sharedChartDialog',
  data() {
    return {
      userName: '',
      noDataReason: '',
      haveContributed: false,
      allChartDataLoaded: false,
      queryExecuted: false,
      chartBusy: false,
      myChartData: {},
      allChartData: [],
      errorMessage: '',
      debounceId: 0,
      sharedChartStyle: {
        width: '0px',
        height: '0px',
      },
    }
  },
  watch: {
    getDisplaySharedChart(val) {
      if (val) {
        this.haveContributed = false
        this.allChartDataLoaded = false
        this.queryExecuted = false
        this.fireSharedDataRequest()
      }
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.resize()
      window.addEventListener('resize', this.resize)
    })
  },
  beforeDestroy() {
    if (sharedChart) {
      sharedChart.destroy()
    }
    window.removeEventListener('resize', this.resize)
  },
  computed: {
    ...mapGetters([
      'getText',
      'getAllChartConfigs',
      'getMriFrontendConfig',
      'getBookmarkIdRequest',
      'getDisplaySharedChart',
      'getSharedBookmarkRequest',
      'getBookmarksData',
      'processResponse',
    ]),
    getSharingText() {
      if (this.haveContributed) {
        return 'Update Contribution'
      }
      return 'Contribute'
    },
  },
  methods: {
    ...mapActions([
      'fireQuery',
      'setDisplaySharedChart',
      'saveSharedBookmarkEntry',
      'loadSharedBookmarkEntryByBookmarkId',
    ]),
    resize() {
      const height = `${window.innerHeight - 181}px`
      const width = `${window.innerWidth - 100}px`
      this.sharedChartStyle = {
        width,
        height,
      }
    },
    close() {
      this.setDisplaySharedChart({ displaySharedChart: false })
    },
    shareBookmarkEntry() {
      const responseObj = this.myChartData
      if (responseObj.data) {
        const dataObj = JSON.parse(JSON.stringify(responseObj.data))
        const config = this.getMriFrontendConfig
        const annotatedData = AnnotateBM.annotateResponse(dataObj, config)
        const bookmarkId = this.getBookmarkIdRequest
        const dataRequest = {
          bookmarkId,
          data: JSON.stringify(annotatedData),
        }
        this.tempData = annotatedData
        this.chartBusy = true
        this.saveSharedBookmarkEntry({ params: dataRequest }).finally(() => {
          this.chartBusy = false
          this.close()
        })
      }
    },
    fireMyQuery() {
      this.chartBusy = true
      const chartConfig = this.getAllChartConfigs
      if (chartConfig && chartConfig.shared && chartConfig.shared.systemName) {
        this.userName = chartConfig.shared.systemName
      }
      const request = this.getSharedBookmarkRequest
      if (Object.keys(request).length !== 0 && request) {
        this.fireQuery({
          url: '/analytics-svc/api/services/population/json/barchart',
          params: { mriquery: JSON.stringify(this.getBookmarksData), datasetId: this.getBookmarksData.datasetId, },
        })
          .then(response => {
            const postProcessedData = postProcessBarChartData(response)
            const data = this.processResponse({ ...postProcessedData })
            this.myChartData = {
              data,
              userName: this.userName,
            }
            let dataFound = false
            for (let i = 0; i < this.allChartData.length; i += 1) {
              if (this.allChartData[i].userName === this.userName) {
                this.allChartData[i] = this.myChartData
                dataFound = true
                break
              }
            }
            if (!dataFound) {
              this.allChartData.push(this.myChartData)
            }
            if (sharedChart) {
              sharedChart.destroy()
            }
            this.setupUI5Control()
            this.renderChart()
            this.queryExecuted = true
            this.chartBusy = false
          })
          .catch(({ message, response }) => {
            if (message !== 'cancel') {
              this.chartBusy = false
            }
            if (response && response.status === 500) {
              this.noDataReason = response.data.errorMessage
              this.renderChart()
            }
          })
      }
    },
    fireSharedDataRequest() {
      this.chartBusy = true
      const chartConfig = this.getAllChartConfigs
      if (chartConfig && chartConfig.shared && chartConfig.shared.systemName) {
        this.userName = chartConfig.shared.systemName
      }
      const bookmarkId = this.getBookmarkIdRequest
      this.loadSharedBookmarkEntryByBookmarkId({ bookmarkId }).then(response => {
        if (response.data) {
          const responseDataResult = JSON.parse(response.data)
          const config = this.getMriFrontendConfig
          if (responseDataResult && responseDataResult.length > 0) {
            const sharedData = []
            for (let i = 0; i < responseDataResult.length; i += 1) {
              if (responseDataResult[i].userName === this.userName) {
                this.haveContributed = true
              }
              const parsedResponse = JSON.parse(responseDataResult[i].data)
              const data = this.processResponse(AnnotateBM.deannotateResponse(parsedResponse, config))
              sharedData.push({
                data,
                userName: responseDataResult[i].userName,
              })
            }
            this.allChartData = sharedData
            if (sharedChart) {
              sharedChart.destroy()
            }
            this.setupUI5Control()
            this.renderChart()
            this.allChartDataLoaded = true
            this.chartBusy = false
          }
        }
      })
    },
    renderChart(override) {
      if (this.allChartData && this.allChartData.length > 0) {
        const sharedData = JSON.parse(JSON.stringify(this.allChartData))
        sharedData.forEach(data2 => {
          data2.data.categories.forEach(category => {
            if (category.id !== 'dummy_category') {
              const filterCardPath = category.id.split('.')
              filterCardPath.pop()
              filterCardPath.pop()
              if (filterCardPath.length <= 1) {
                const defaultTitle = this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
                category.name = `${defaultTitle} - ${category.name}`
              } else {
                const filterCard = this.getMriFrontendConfig.getAttributeByPath(category.id).getParentFilterCard()
                category.name = `${filterCard.getName()} - ${category.name}`
              }
            }
          })
        })

        if (this.sharedChartStyle.width && override && sharedChartController.setHeight) {
          sharedChartController.setWidth(this.sharedChartStyle.width)
        } else if (override && sharedChartController.setHeight) {
          sharedChartController.setWidth('100%')
        }

        if (this.sharedChartStyle.height && override && sharedChartController.setHeight) {
          sharedChartController.setHeight(this.sharedChartStyle.height)
        } else if (override && sharedChartController.setHeight) {
          sharedChartController.setHeight('100%')
        }

        if (sap) {
          const eventBus = sap.ui.getCore().getEventBus()
          if (this.noDataReason) {
            eventBus.publish('VUE_SHARED_CHART_UPDATE', {
              sharedData,
              noDataReason: this.noDataReason,
            })
          } else {
            eventBus.publish('VUE_SHARED_CHART_UPDATE', {
              sharedData,
            })
          }
        }
      }
    },
    setupUI5Control() {
      sharedChart = new sap.ui.xmlview({
        viewName: 'hc.mri.pa.ui.views.VueSharedChart',
        width: '100%',
        height: '100%',
      })
      sharedChartController = sharedChart.getController()
      sharedChart.placeAt(this.$refs.chart)
    },
  },
  components: {
    MessageBox,
    appButton,
  },
}
</script>
