<template>
  <div class="chartToolbar-main-container">
    <div class="d-flex">
      <button
        v-if="!showUnHideFilters"
        class="actionButton"
        @click="toggleLeftPanel"
        :title="getText('MRI_PA_TOOLTIP_COLLAPSE_FILTER_BAR')"
      >
        <span class="icon" style="font-family: app-icons">{{ hideIcon }}</span>
      </button>
      <button
        v-if="showUnHideFilters"
        class="actionButton"
        @click="toggleLeftPanel"
        :title="getText('MRI_PA_TOOLTIP_EXPAND_FILTER_BAR')"
      >
        <span class="icon" style="font-family: app-icons">{{ unHideIcon }}</span>
      </button>
    </div>
    <div class="d-flex">
      <template v-for="chart in chartConfig" :key="chart.name">
        <chartButton
          @clickEv="switchChart(chart)"
          :name="chart.name"
          :icon="chart.icon"
          :iconGroup="chart.iconGroup"
          :title="getText(chart.tooltip)"
          :activeChart="getActiveChart"
        ></chartButton>
        <span class="separator"></span>
      </template>

      <button
        class="toolbarButton"
        :title="getText('MRI_PA_BUTTON_DRILL_DOWN')"
        v-bind:class="{ toolbarButtonDisabled: !drilldownEnabled }"
        :disabled="!drilldownEnabled"
        @click="drillDownClicked"
      >
        <span class="icon" style="font-family: app-icons"></span>
      </button>

      <span class="separator" />

      <button
        class="actionButton"
        @click="showFilterCardSummary"
        :title="getText('MRI_PA_TITLE_FILTER_SUMMARY_TOOLTIP')"
      >
        <icon icon="summaryDoc" />
      </button>

      <span class="separator" />

      <downloadMenu></downloadMenu>

      <div class="vertical-spacer"></div>
      <patientCount :popOverPosition="patientCountPopoverPosition" />
      <span class="separator" />
      <button id="vb-searchPopover" class="actionButton" v-if="getActiveChart === 'vb'" @click="searchClicked">
        <span class="icon" style="font-family: app-icons"></span>
      </button>
      <!-- <span class="separator" />
      <button
        id="idConfigSettings"
        class="actionButton"
        @click="openSettingsConfig"
        :title="getText('MRI_PA_SELECT_CONFIGURATION')"
      >
        <span class="icon" style="font-family: app-icons"></span>
      </button> -->
    </div>
  </div>
</template>

<script lang="ts">
declare var sap
import { mapActions, mapGetters } from 'vuex'
import ChartButton from './ChartButton.vue'
import DropDownMenu from './DropDownMenu.vue'
import patientCount from './PatientCount.vue'
import Constants from '../utils/Constants'
import icon from '../lib/ui/app-icon.vue'
import appIcon from '../lib/ui/app-icon.vue'
import DownloadMenu from './DownloadMenu.vue'

export default {
  name: 'chartToolbar',
  props: ['hideEv', 'config', 'collectionEv', 'showUnHideFilters'],
  data() {
    return {
      chartConfig: [],
      patientTotalRequested: false,
      patientListTotalRequested: false,
      disableCensoring: true,
      unHideIcon: '',
      hideIcon: '',
      hideIconToolTip: '',
      toggleFilterCardSummary: false,
    }
  },
  watch: {
    getHasAssignedConfig(val) {
      if (val) {
        this.chartConfig = this.visibleChartTypes(this.getAllChartConfigs)
        this.setPatientTotalRequested(false)
        this.setPatientListTotalRequested(false)
        this.refreshPatientCount()
      }
    },
    getActiveChart(val) {
      this.refreshPatientCount()
    },
  },
  mounted() {
    try {
    this.$nextTick(() => {
      window.addEventListener('click', this.closeSubMenu)
    })
    this.requestTotalPatientCount()
    // The config is available when component mounts already to check if interactive mode is used
    this.chartConfig = this.visibleChartTypes(this.getAllChartConfigs)
    this.setPatientListTotalRequested(false)
    this.refreshPatientCount()
    this.loadValuesForAttributePath({
      attributePathUid: 'conceptSets',
      searchQuery: '',
      attributeType: 'conceptSet',
    })
    } catch (e) {
      console.error(e)
    }
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {
    ...mapGetters([
      'getActiveChart',
      'getChartSelection',
      'getHasAssignedConfig',
      'getAllChartConfigs',
      'getMriFrontendConfig',
      'getText',
      'getSelectedDataset',
      'getMriFrontendConfig',
    ]),
    chartSelection() {
      return this.getChartSelection()
    },
    drilldownEnabled() {
      if (
        // this.getActiveChart !== "vb" &&
        this.chartSelection &&
        this.chartSelection.length > 0
      ) {
        return true
      }
      return false
    },
    getSelectedDatasetText(){
      return this.getSelectedDataset.name == "" ? "Untitled" : this.getSelectedDataset.name
    }
  },
  methods: {
    ...mapActions([
      'setActiveChart',
      'firePatientCountQuery',
      'firePatientListCountQuery',
      'setFireRequest',
      'toggleConfigSelectionDialog',
      'setDatasetVersion',
      'setDataset',
      'requestDatasetVersions',
      'loadValuesForAttributePath',
      'setPatientListTotalRequested',
      'setPatientTotalRequested',
      'requestTotalPatientCount',
      'refreshPatientCount'
    ]),
    openSettingsConfig() {
      const eventBus = sap.ui.getCore().getEventBus()
      this.toggleConfigSelectionDialog()
    },
    closeSubMenu(event) {
      if (
        this.downloadMenuOpened &&
        event.target !== this.$refs.menuButton &&
        event.target.parentElement !== this.$refs.menuButton
      ) {
        this.downloadButtonClose()
      }
    },
    visibleChartTypes(chartOptions) {
      if (chartOptions) {
        let activeChartDownloads = false
        let activeChartCollections = false
        let activeChartPdfDownloads = false

        if (chartOptions && !chartOptions.custom) {
          chartOptions.custom = {
            visible: true,
            downloadEnabled: false,
            pdfDownloadEnabled: false,
            collectionEnabled: false,
          }
        }

        if (chartOptions && !chartOptions.sac) {
          chartOptions.sac = {
            visible: true,
            downloadEnabled: false,
            pdfDownloadEnabled: false,
            collectionEnabled: false,
          }
        }

        const chartTypeData = []
        Object.keys(Constants.chartInfo).forEach(key => {
          if (chartOptions[key] && chartOptions[key].visible) {
            const chartInfo = Constants.chartInfo[key]
            Object.keys(chartOptions[key]).forEach(key2 => {
              chartInfo[key2] = chartOptions[key][key2]
            })
            if (chartInfo.name === chartOptions.initialChart) {
              activeChartDownloads = chartInfo.downloadEnabled || false
              activeChartPdfDownloads = chartInfo.pdfDownloadEnabled || false
              activeChartCollections = chartInfo.collectionEnabled || false
            }
            chartTypeData.push(chartInfo)
          }
        })

        this.activeChartDownloads = activeChartDownloads
        this.activeChartCollections = activeChartCollections
        this.activeChartPdfDownloads = activeChartPdfDownloads
        return chartTypeData
      }
      return []
    },
    switchChart(button) {
      this.setActiveChart(button.name)
      let activeChartDownloads = false
      let activeChartCollections = false
      let activeChartPdfDownloads = false

      this.chartConfig.forEach(element => {
        if (element.name === button.name) {
          activeChartDownloads = element.downloadEnabled
          activeChartCollections = element.collectionEnabled
          activeChartPdfDownloads = element.pdfDownloadEnabled
        }
      })

      this.activeChartDownloads = activeChartDownloads
      this.activeChartCollections = activeChartCollections
      this.activeChartPdfDownloads = activeChartPdfDownloads

      this.setFireRequest()
    },
    showFilterCardSummary() {
      this.toggleFilterCardSummary = !this.toggleFilterCardSummary
      this.$emit('open-filtersummary', this.toggleFilterCardSummary)
    },
    getHideIconToolTip() {
      if (this.hideIconToolTip === '') {
        this.hideIconToolTip = this.getText('MRI_PA_TOOLTIP_COLLAPSE_FILTER_BAR')
      }
      return this.hideIconToolTip
    },
    searchClicked() {
      const eventBus = sap.ui.getCore().getEventBus()
      eventBus.publish('EVENT_VB_SEARCH_CLICK', {})
    },
    toggleLeftPanel() {
      this.$emit('unhideEv')
    },
    drillDownClicked() {
      this.$emit('drilldown')
    },
  },
  components: {
    ChartButton,
    DropDownMenu,
    icon,
    patientCount,
    appIcon,
    DownloadMenu,
  },
}
</script>
