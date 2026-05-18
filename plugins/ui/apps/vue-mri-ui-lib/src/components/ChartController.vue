<template>
  <div class="chartController" v-bind:class="{ withoutAxis: withoutAxis, genomics: getActiveChart === 'vb' }">
    <div v-if="getChartCover" class="chartCover"></div>
    <div class="chartControllerContent">
      <div class="axisContainer" ref="axisContainer">
        <!-- <div class="kaplanAxis-label" v-if="getActiveChart === 'vb'">{{ getText('MRI_PA_KAPLAN_AXIS_TITLE') }}</div> -->
        <div class="axis-group axis-group--top">
          <chartTypeAxisButton
            v-if="getActiveChart === 'stacked' && chartTypeAxisButtonVisible"
            :parentContainer="$refs.axisContainer"
          ></chartTypeAxisButton>
          <div class="axis-subgroup">
            <axisMenuButton
              v-if="getAllAxes[Constants.MRIChartDimensions.Y]?.props.active"
              :dimensionIndex="Constants.MRIChartDimensions.Y"
              :beforeSelect="getBeforeSelectHandler(Constants.MRIChartDimensions.Y)"
            ></axisMenuButton>
            <axisMenuButton
              v-if="getAllAxes[Constants.MRIChartDimensions.StackAttribute]?.props.active"
              :dimensionIndex="Constants.MRIChartDimensions.StackAttribute"
              :beforeSelect="getBeforeSelectHandler(Constants.MRIChartDimensions.StackAttribute)"
            ></axisMenuButton>
          </div>
          <cohortEntryExit v-if="displayShowCohortEntryExit"></cohortEntryExit>
        </div>
        <div class="axis-group axis-group--bottom">
          <div class="axis-subgroup">
            <div class="sort-button">
              <!-- <div class="sort-label" v-if="displaySort">{{ getText('MRI_PA_CHART_SORT_LABEL') }}</div> -->
              <sortMenuButton v-if="displaySort"></sortMenuButton>
            </div>
            <xAxisColorButton
              :parentContainer="$refs.axisContainer"
              :selectedAxis="colorAxisIndex"
              :disabled="isColorButtonDisabled"
              @colorAxisSelected="onColorAxisSelected"
            ></xAxisColorButton>
          </div>
          <div class="axis-subgroup">
            <axisMenuButton
              v-if="getAllAxes[Constants.MRIChartDimensions.X2]?.props.active"
              :dimensionIndex="Constants.MRIChartDimensions.X2"
              :beforeSelect="getBeforeSelectHandler(Constants.MRIChartDimensions.X2)"
            ></axisMenuButton>
            <axisMenuButton
              v-if="getAllAxes[Constants.MRIChartDimensions.X1]?.props.active"
              :dimensionIndex="Constants.MRIChartDimensions.X1"
              :beforeSelect="getBeforeSelectHandler(Constants.MRIChartDimensions.X1)"
            ></axisMenuButton>
            <axisMenuButton
              v-if="getAllAxes[Constants.MRIChartDimensions.X3]?.props.active"
              :dimensionIndex="Constants.MRIChartDimensions.X3"
              :beforeSelect="getBeforeSelectHandler(Constants.MRIChartDimensions.X3)"
            ></axisMenuButton>
          </div>
        </div>
      </div>
      <div class="chartContainer">
        <loadingAnimation v-if="chartBusy"></loadingAnimation>
        <stackBarChart
          v-if="getActiveChart === 'stacked'"
          @busyEv="setChartBusy"
          :shouldRerenderChart="shouldRerenderChart"
          :colorAxisIndex="effectiveColorAxisIndex"
          @chartDataReady="onChartDataReady"
        ></stackBarChart>
        <!-- <variantBrowser v-if="getActiveChart === 'vb'" :response="response" @busyEv="setChartBusy"></variantBrowser> -->
        <patientListContainer
          v-if="getActiveChart === 'list'"
          @busyEv="setChartBusy"
          :showLeftPane="showLeftPane"
        ></patientListContainer>
      </div>
    </div>
    <messageBox
      messageType="warning"
      dim="true"
      dialogWidth="400px"
      v-if="showClearConfirmation"
      @close="cancelClearSelection"
    >
      <template v-slot:header>{{ getText('MRI_PA_CONFIRM_SELECTION_CHANGE') }}</template>
      <template v-slot:body>
        <div>{{ clearConfirmationMessage }}</div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton :click="confirmClearSelection" :text="getText('MRI_PA_BUTTON_CONFIRM')"></appButton>
        <appButton :click="cancelClearSelection" :text="getText('MRI_PA_BUTTON_CANCEL')"></appButton>
      </template>
    </messageBox>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import appCheckbox from '../lib/ui/app-checkbox.vue'
import appLabel from '../lib/ui/app-label.vue'
import Constants from '../utils/Constants'
import messageBox from './MessageBox.vue'
import appButton from '../lib/ui/app-button.vue'
import AxisMenuButton from './AxisMenuButton.vue'
import DropDownMenu from './DropDownMenu.vue'
import XAxisColorButton from './XAxisColorButton.vue'
import ChartTypeAxisButton from './ChartTypeAxisButton.vue'
import LoadingAnimation from './LoadingAnimation.vue'
import PatientListContainer from './PatientListContainer.vue'
import SacChart from './SACChart.vue'
import SortMenuButton from './SortMenuButton.vue'
import CohortEntryExit from './CohortEntryExit.vue'
import StackBarChart from './StackBarChart.vue'
import CohortsAppMenu from './CohortsAppMenu.vue'
import patientCount from './PatientCount.vue'

export default {
  name: 'chartController',
  props: ['shouldRerenderChart', 'showLeftPane', 'chartBusy'],
  data() {
    return {
      Constants,
      response: {},
      showCensoring: false,
      showErrorLines: false,
      series: [],
      activeChartCollections: false,
      colorAxisIndex: null as number | null,
      hasSetDefaultColorAxis: false,
      showClearConfirmation: false,
      clearConfirmationMessage: '',
      pendingConfirmResolve: null as ((value: boolean) => void) | null,
      pendingCancelRevert: null as (() => void) | null,
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
  beforeUnmount() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  watch: {
    getActiveBookmark(newVal, oldVal) {
      // Reset default color axis flag only when switching to a different cohort,
      // not when saving/updating the currently active bookmark (same bmkId).
      if (newVal?.bmkId !== oldVal?.bmkId) {
        this.hasSetDefaultColorAxis = false
        this.colorAxisIndex = null
      }
    },
    getBarChartType(newVal: string) {
      // Clear the X-axis color selection whenever the chart type stops being stacked bar chart
      if (newVal !== 'stack') {
        this.colorAxisIndex = null
      }
    },
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
      'getActiveBookmark',
      'getBarChartType',
    ]),
    isColorButtonDisabled() {
      return this.getBarChartType !== 'stack'
    },
    effectiveColorAxisIndex() {
      return this.isColorButtonDisabled ? null : this.colorAxisIndex
    },
    stackAttributeHasSelection() {
      const axis = this.getAllAxes[Constants.MRIChartDimensions.StackAttribute]
      return !!(axis?.props?.filterCardId && axis?.props?.key)
    },
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
      return this.getMriFrontendConfig?._internalConfig?.panelOptions?.cohortEntryExit || false
    },
    chartTypeAxisButtonVisible() {
      const stackedOptions = this.getMriFrontendConfig?._internalConfig?.chartOptions?.stacked
      if (!stackedOptions) return false
      return (
        !!stackedOptions.overlappingHistogramEnabled ||
        !!stackedOptions.overlappingBarChartEnabled ||
        !!stackedOptions.kernelDensityPlotEnabled
      )
    },
  },
  methods: {
    ...mapActions(['setFireRequest', 'setKMDisplayInfo', 'clearAxisValue']),
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
    getBeforeSelectHandler(index: number) {
      if (index === Constants.MRIChartDimensions.StackAttribute) {
        return this.confirmStackingOverColor
      }
      return null
    },
    confirmStackingOverColor(): Promise<boolean> {
      if (this.colorAxisIndex === null) {
        return Promise.resolve(true)
      }
      this.clearConfirmationMessage = this.getText('MRI_PA_CONFIRM_CLEAR_COLOR')
      this.pendingCancelRevert = null
      return new Promise<boolean>(resolve => {
        this.pendingConfirmResolve = (confirmed: boolean) => {
          if (confirmed) {
            this.colorAxisIndex = null
          }
          resolve(confirmed)
        }
        this.showClearConfirmation = true
      })
    },
    onColorAxisSelected(axisIndex: number) {
      if (this.stackAttributeHasSelection) {
        this.clearConfirmationMessage = this.getText('MRI_PA_CONFIRM_CLEAR_STACKING')
        this.pendingCancelRevert = null
        this.pendingConfirmResolve = (confirmed: boolean) => {
          if (confirmed) {
            this.colorAxisIndex = axisIndex
            this.clearAxisValue(Constants.MRIChartDimensions.StackAttribute)
            this.setFireRequest()
          }
        }
        this.showClearConfirmation = true
      } else {
        this.colorAxisIndex = axisIndex
        this.clearAxisValue(Constants.MRIChartDimensions.StackAttribute)
      }
    },
    confirmClearSelection() {
      if (this.pendingConfirmResolve) {
        this.pendingConfirmResolve(true)
      }
      this.showClearConfirmation = false
      this.clearConfirmationMessage = ''
      this.pendingConfirmResolve = null
      this.pendingCancelRevert = null
    },
    cancelClearSelection() {
      if (this.pendingCancelRevert) {
        this.pendingCancelRevert()
      }
      if (this.pendingConfirmResolve) {
        this.pendingConfirmResolve(false)
      }
      this.showClearConfirmation = false
      this.clearConfirmationMessage = ''
      this.pendingConfirmResolve = null
      this.pendingCancelRevert = null
    },
    onChartDataReady(xAxisCategoryCounts: { axisIndex: number; count: number }[]) {
      if (this.hasSetDefaultColorAxis || xAxisCategoryCounts.length === 0) return
      if (this.stackAttributeHasSelection) return
      if (this.isColorButtonDisabled) return
      this.hasSetDefaultColorAxis = true

      // Find the axis with the smaller number of categories
      const sorted = [...xAxisCategoryCounts].sort((a, b) => a.count - b.count)
      const smallest = sorted[0]

      // Only set default if the smallest category count is <= 5
      if (smallest.count > 5) return

      this.$nextTick(() => {
        this.colorAxisIndex = smallest.axisIndex
      })
    },
  },
  components: {
    messageBox,
    appButton,
    AxisMenuButton,
    DropDownMenu,
    XAxisColorButton,
    ChartTypeAxisButton,
    LoadingAnimation,
    SortMenuButton,
    CohortEntryExit,
    StackBarChart,
    PatientListContainer,
    SacChart,
    appLabel,
    appCheckbox,
    CohortsAppMenu,
    patientCount,
  },
}
</script>
