<template>
  <div class="chartController" v-bind:class="{ withoutAxis: withoutAxis, genomics: getActiveChart === 'vb' }">
    <div v-if="getChartCover" class="chartCover"></div>
    <div class="chartControllerContent">
      <div class="axisContainer" ref="axisContainer">
        <!-- <div class="kaplanAxis-label" v-if="getActiveChart === 'vb'">{{ getText('MRI_PA_KAPLAN_AXIS_TITLE') }}</div> -->
        <template v-for="(item, index) in getAllAxes" :key="index">
          <axisMenuButton v-if="item.props.active" :dimensionIndex="index"></axisMenuButton>
        </template>
        <div class="sort-label" v-if="displaySort">{{ getText('MRI_PA_CHART_SORT_LABEL') }}</div>
        <sortMenuButton v-if="displaySort"></sortMenuButton>
        <cohortEntryExit v-if="displayShowCohortEntryExit"></cohortEntryExit>
      </div>
      <div class="chartContainer">
        <loadingAnimation v-if="chartBusy"></loadingAnimation>
        <stackBarChart
          v-if="getActiveChart === 'stacked'"
          @busyEv="setChartBusy"
          :shouldRerenderChart="shouldRerenderChart"
        ></stackBarChart>
        <!-- <variantBrowser v-if="getActiveChart === 'vb'" :response="response" @busyEv="setChartBusy"></variantBrowser> -->
        <patientListContainer
          v-if="getActiveChart === 'list'"
          @busyEv="setChartBusy"
          :showLeftPane="showLeftPane"
        ></patientListContainer>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import appCheckbox from '../lib/ui/app-checkbox.vue'
import appLabel from '../lib/ui/app-label.vue'
import Constants from '../utils/Constants'
import AxisMenuButton from './AxisMenuButton.vue'
import DropDownMenu from './DropDownMenu.vue'
import LoadingAnimation from './LoadingAnimation.vue'
import PatientListContainer from './PatientListContainer.vue'
import SacChart from './SACChart.vue'
import SortMenuButton from './SortMenuButton.vue'
import CohortEntryExit from './CohortEntryExit.vue'
import StackBarChart from './StackBarChart.vue'
import VariantBrowser from './VariantBrowser.vue'
import CohortsAppMenu from './CohortsAppMenu.vue'
import patientCount from './PatientCount.vue'

export default {
  name: 'chartController',
  props: ['shouldRerenderChart', 'showLeftPane', 'chartBusy'],
  data() {
    return {
      response: {},
      showCensoring: false,
      showErrorLines: false,
      series: [],
      activeChartCollections: false,
    }
  },
  created() {
    if (this.getKMDisplayInfo.hasOwnProperty('censoring')) {
      this.showCensoring = this.getKMDisplayInfo.censoring
    }
    if (this.getKMDisplayInfo.hasOwnProperty('errorlines')) {
      this.showErrorLines = this.getKMDisplayInfo.errorlines
    }
  },
  updated() {
    if (this.getKMDisplayInfo.hasOwnProperty('censoring')) {
      this.showCensoring = this.getKMDisplayInfo.censoring
    }
    if (this.getKMDisplayInfo.hasOwnProperty('errorlines')) {
      this.showErrorLines = this.getKMDisplayInfo.errorlines
    }
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('click', this.closeSubMenu)
    })
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {
    ...mapGetters([
      'getActiveChart',
      'getAllAxes',
      'getAllChartProperties',
      'getAllChartConfigs',
      'getMriFrontendConfig',
      'getText',
      'getGenomicsAxisVisible',
      'getChartCover',
      'getChartSelection',
      'getKMDisplayInfo',
      'getMriFrontendConfig',
    ]),
    showCohorts() {
      if (this.getMriFrontendConfig) {
        return this.getMriFrontendConfig._internalConfig.panelOptions.addToCohorts
      }
      return false
    },
    chartProperties() {
      return this.getAllChartProperties()
    },
    displaySort() {
      const chartProperties = this.chartProperties
      if (
        chartProperties &&
        chartProperties[Constants.MRIChartProperties.Sort] &&
        chartProperties[Constants.MRIChartProperties.Sort].props &&
        chartProperties[Constants.MRIChartProperties.Sort].props.active
      ) {
        return true
      }
      return false
    },
    withoutAxis() {
      return this.getActiveChart === 'list' || (this.getActiveChart === 'vb' && !this.getGenomicsAxisVisible)
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
    chartSelection() {
      return this.getChartSelection()
    },
    displayShowCohortEntryExit() {      
      return this.getMriFrontendConfig._internalConfig.panelOptions.cohortEntryExit
    }
  },
  methods: {
    ...mapActions(['setFireRequest', 'setKMDisplayInfo']),
    setChartBusy(status) {
      this.$emit('setChartBusy', status)
    },
    updateDisplay() {
      this.setKMDisplayInfo({
        displayInfo: {
          errorlines: this.showErrorLines,
          censoring: this.showCensoring,
        },
      })
      this.$emit('drilldown')
    },
    chartConfigs() {
      return this.getAllChartConfigs
    },
  },
  components: {
    AxisMenuButton,
    DropDownMenu,
    LoadingAnimation,
    SortMenuButton,
    CohortEntryExit,
    StackBarChart,
    VariantBrowser,
    PatientListContainer,
    // CustomChart,
    SacChart,
    appLabel,
    appCheckbox,
    CohortsAppMenu,
    patientCount,
  },
}
</script>
