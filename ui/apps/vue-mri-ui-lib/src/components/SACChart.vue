<template>
  <div class="custom-container" style="width: 100%; height: 100%">
    <div class="navigation">
      <template v-for="(item, index) in chartNames" :key="item">
        <button
          @click="switchActiveChart(index)"
          class="chartButton"
          v-bind:class="{ selectedChart: index === activeChartIndex }"
        >
          {{ item }}
        </button>
      </template>
    </div>
    <div class="content">
      <iframe style="height: 100%; width: 100%" ref="SACframe" v-if="firstFrameLoad" />
    </div>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'sacChart',
  props: ['busyEv'],
  data() {
    return {
      firstFrameLoad: false,
      activeChartIndex: -1,
      activeChartUrl: '',
      chartNames: [],
      url: [],
    }
  },
  watch: {
    getFireRequest() {
      if (this.getBookmarksData && Object.keys(this.getBookmarksData).length > 0) {
        this.renderChart()
      }
    },
  },
  computed: {
    ...mapGetters([
      'getMriFrontendConfig',
      'getRequest',
      'getChartSize',
      'getResponse',
      'getBookmarksData',
      'getFireRequest',
    ]),
    frontEndConfig() {
      return this.getMriFrontendConfig
    },
  },
  methods: {
    ...mapActions(['disableAllAxesandProperties', 'fireQuery']),
    setupCharts() {
      // Get Config and initialize xmlviews into arrays
      const chartOptions = this.frontEndConfig._internalConfig.chartOptions
      let sacChartConfig = { ...chartOptions.sac }

      if (!sacChartConfig) {
        sacChartConfig = {
          defaultIndex: 0,
          sacCharts: [],
        }
      }

      if (!sacChartConfig.sacCharts) {
        sacChartConfig.sacCharts = []
      }

      if (!sacChartConfig.defaultIndex) {
        sacChartConfig.defaultIndex = 0
      }

      const chartNames = []
      const url = []
      sacChartConfig.sacCharts.forEach(config => {
        chartNames.push(config.chartName)
        url.push(config.url)
      })

      this.chartNames = chartNames
      this.url = url
      this.disableAllAxesandProperties()
      this.$nextTick(() => {
        this.switchActiveChart(sacChartConfig.defaultIndex)
      })
    },
    switchActiveChart(activeChart) {
      this.activeChartIndex = activeChart

      this.activeChartUrl = this.url && this.url[activeChart] ? this.url[activeChart] : ''

      this.$nextTick(() => {
        this.renderChart()
      })
    },
    renderChart() {
      if (this.getBookmarksData && Object.keys(this.getBookmarksData).length > 0) {
        this.fireQuery({
          url: '/analytics-svc/api/services/calcview/updatepatientids',
          params: this.getBookmarksData,
        }).then(() => {
          this.firstFrameLoad = true
          this.$nextTick(() => {
            this.$refs.SACframe.src = this.activeChartUrl
          })
        })
      }
    },
  },
  mounted() {
    this.$nextTick(() => {
      // window.addEventListener('resize', this.renderChart);
    })

    this.setupCharts()
  },
  beforeDestroy() {
    // window.removeEventListener('resize', this.renderChart);
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
</style>
