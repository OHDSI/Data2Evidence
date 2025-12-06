<template>
  <div class="km-container MriPaKaplan" ref="kmChart">
    <template v-if="errorMessage">
      <chartErrorMessage :errorMessage="errorMessage"></chartErrorMessage>
    </template>
    <template v-else>
      <div class="km-chart-containter">
        <div class="km-chart" id="kmCompare-chart" ref="chart" v-mouse-scroll="mousewheelHandler"></div>
        <div class="km-slider-row">
          <div class="km-slider" @mouseover="sliderHover" @mouseleave="sliderOut">
            <vue-slider ref="slider" v-model="rangeSliderValue" :max="sliderMaxRange" :real-time="true" :lazy="true">
              <template v-slot:tooltip="tooltip">
                <div
                  class="km-range-slider-tooltip"
                  @mouseleave="tooltipOut"
                  @mouseover="tooltipHover"
                  v-bind:class="{
                    visible: sliderHoverState || tooltipHoverState || tooltipFocusLeft || tooltipFocusRight,
                  }"
                >
                  <input
                    v-model="cachedRangeSliderValue[tooltip.index]"
                    v-on:click.stop="onInputClick"
                    v-on:keypress="sliderInputCheck($event, tooltip.index)"
                    v-on:mousedown.stop="onInputClick"
                    @focus="tooltipFocus(tooltip.index)"
                    @blur="tooltipBlur(tooltip.index)"
                  />
                </div>
              </template>
            </vue-slider>
          </div>
          <div class="km-unitMenu">
            <kMUnitMenu @updateUnitEvt="updateUnit"></kMUnitMenu>
          </div>
        </div>
      </div>
      <div ref="info" class="km-info">
        <div class="flexItem" v-on:mouseover="logRankMouseIn" v-on:mouseout="logRankMouseOut">
          <appLabel
            :cssClass="'km-label'"
            :title="getText('MRI_PA_KAPLAN_LOG_RANK')"
            :text="getText('MRI_PA_KAPLAN_LOG_RANK_HEADER')"
          />
          <button
            ref="kmLogRankHelp"
            v-if="showKMLogRankHelpPopOverIcon"
            class="km-help"
            @click="openKMLogRankHelpPopOver"
            v-bind:class="{ visible: showKMLogRankHelpPopOverHover || showKMLogRankHelpPopOver }"
          >
            <span class="icon" style="font-family: app-icons"></span>
          </button>
        </div>
        <div class="flexItem" v-on:mouseover="logRankMouseIn" v-on:mouseout="logRankMouseOut">
          <label class="km-logRankPValue">{{ globalPValue }}</label>
        </div>
        <div class="flexItem">
          <div class="axis-menu-button-wrapper kmInteractionList-wrapper kmControlComponent kmStatisticButton">
            <div class="buttonWrapper">
              <button class="MriPaKMInfoBtnTextOverFlow" @click="openKMStatisticsPopup">
                {{ getText('MRI_PA_KAPLAN_BUT_CURVE_ANA') }}
              </button>
            </div>
          </div>
        </div>
        <div class="flexItem">
          <kmLegend v-if="showSubComponents" :series="series" :categories="chartData.categories" />
        </div>
      </div>
      <chartPopover v-if="showTooltip" :position="tooltipPosition">
        <template v-slot:body>
          <div class="kmPopover">
            <div class="kmPopoverContentDimensions">
              <template v-for="category in tooltipCategories" :key="category.value">
                <span v-bind:style="{ color: category.bg }" class="kmPopoverContentDimensionValue">{{
                  category.value
                }}</span>
              </template>
            </div>
            <div class="kmPopoverContentMeasures">
              <template v-for="measures in tooltipMeasures" :key="measures.name">
                <div class="kmPopoverContentMeasuresContainer">
                  <span class="kmPopoverContentMeasureName">{{ measures.name }}</span>
                  <span class="kmPopoverContentMeasureValue">{{ measures.value }}</span>
                </div>
              </template>
            </div>
          </div>
        </template>
      </chartPopover>
      <messageBox v-if="showKMStatisticsPopup" dim="true" @close="closeKMStatisticsPopup" messageType="custom">
        <template v-slot:header>{{ getText('MRI_PA_KAPLAN_CURVE_ANA_HED') }}</template>
        <template v-slot:body>
          <div class="flex-spacer">
            <div style="padding: 30px 30px 30px 30px">
              <div class="body-container label-for">
                <kmStatisticsTable :dof="getGlobalDoF()" :pvalue="globalPValue" :chartData="chartData" />
              </div>
            </div>
          </div>
        </template>
        <template v-slot:footer>
          <div class="flex-spacer"></div>
          <appButton
            :click="closeKMStatisticsPopup"
            :text="getText('MRI_PA_KAPLAN_CURVE_ANA_POPUP_BUT_CLOSE')"
            v-focus
          ></appButton>
        </template>
      </messageBox>
      <errorMessageBox
        v-if="showKMStatisticsErrPopupForMoreCurves"
        @ok="closeKMStatisticsErrPopupForMoreCurves"
        :header="getText('MRI_PA_KAPLAN_CURVE_ANA_MORE_CURVES_SELECTED_ERR_POPUP_HED')"
        :message="getText('MRI_PA_KAPLAN_CURVE_ANA_MORE_CURVES_SELECTED')"
      />
      <errorMessageBox
        v-if="showKMStatisticsErrPopupForOneCurve"
        @ok="closeKMStatisticsErrPopupForOneCurve"
        :header="getText('MRI_PA_KAPLAN_CURVE_ANA_1_CURVE_SELECTED_ERR_POPUP_HED')"
        :message="getText('MRI_PA_KAPLAN_CURVE_ANA_1_CURVE_SELECTED')"
      />
      <dialogBox
        v-if="showKMLogRankHelpPopOver"
        @close="showKMLogRankHelpPopOver = false"
        :position="kmLogRankHelpPopoverPosition"
        :arrow="'arrowUp'"
        :arrowPosition="kmLogRankHelpArrowPosition"
        dialogWidth="300px"
        :dim="false"
      >
        <template v-slot:header>
          <span class="km-logrank-help-popover-header">{{
            getText('MRI_PA_KAPLAN_CURVE_ANA_1_CURVE_SELECTED_ERR_POPOVER_HED')
          }}</span>
        </template>
        <template v-slot:body>
          <div class="km-logrank-help-popover-content">
            <div class="km-logrank-help-popover-content-container">
              <div class="km-logrank-help-popover-content-data">
                {{ getText('MRI_PA_KAPLAN_CURVE_ANA_1_CURVE_SELECTED_ERR_POPOVER') }}
              </div>
            </div>
          </div>
        </template>
      </dialogBox>
    </template>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import d3 from 'd3'
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import appLabel from '../lib/ui/app-label.vue'
import Constants from '../utils/Constants'
import chartErrorMessage from './ChartErrorMessage.vue'
import ChartPopover from './ChartPopover.vue'
import DialogBox from './DialogBox.vue'
import kmLegend from './KMLegend.vue'
import kmStatisticsTable from './KMStatisticsTable.vue'
import KMUnitMenu from './KMUnitMenu.vue'
import messageBox from './MessageBox.vue'
import errorMessageBox from './Notification.vue'

const X_PADDING = 50
const Y_PADDING = 20
const MAX_LEGEND_WIDTH = 20
const DAYS_PER_DAY = 1
const DAYS_PER_WEEK = 7
const DAYS_PER_YEAR = 365.24
const DAYS_PER_MONTH = DAYS_PER_YEAR / 12

const MULTIPLIER = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

const UNIT_DATA = {
  days: {
    label: 'MRI_PA_KAPLAN_DAYS_LONG',
    unitLabel: 'MRI_PA_KAPLAN_DAY',
    avgDaysInUnit: DAYS_PER_DAY,
    upperRangeLimit: DAYS_PER_MONTH,
    digitsAfterDecimalPoint: 0,
    fontStyle: 'normal',
    fontWeight: 'normal',
  },
  weeks: {
    label: 'MRI_PA_KAPLAN_WEEKS_LONG',
    unitLabel: 'MRI_PA_KAPLAN_WEEK',
    avgDaysInUnit: DAYS_PER_WEEK,
    upperRangeLimit: 12 * DAYS_PER_WEEK,
    digitsAfterDecimalPoint: 1,
    fontStyle: 'normal',
    fontWeight: 'normal',
  },
  months: {
    label: 'MRI_PA_KAPLAN_MONTHS_LONG',
    unitLabel: 'MRI_PA_KAPLAN_MONTH',
    avgDaysInUnit: DAYS_PER_MONTH,
    upperRangeLimit: 3 * DAYS_PER_YEAR,
    digitsAfterDecimalPoint: 1,
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  years: {
    label: 'MRI_PA_KAPLAN_YEARS_LONG',
    unitLabel: 'MRI_PA_KAPLAN_YEAR',
    avgDaysInUnit: DAYS_PER_YEAR,
    upperRangeLimit: null,
    digitsAfterDecimalPoint: 1,
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
}

const CancelToken = axios.CancelToken
let cancel: any

interface Props {
  busyEv?: boolean
  bookmarkList?: any[]
  xAxes?: string
  yAxis?: string
  kmStartEvent?: string
  kmStartEventOccurence?: string
  kmEndEvent?: string
  kmEndEventOccurence?: string
  censoring?: boolean
  errorLines?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  busyEv: false,
  bookmarkList: () => [],
  xAxes: '',
  yAxis: '',
  kmStartEvent: '',
  kmStartEventOccurence: '',
  kmEndEvent: '',
  kmEndEventOccurence: '',
  censoring: false,
  errorLines: false,
})

const emit = defineEmits<{
  busyEv: [value: boolean]
  response: [data: any]
  lowerAxisMenu: [properties: any]
}>()

const store = useStore()

const getMriFrontendConfig = computed(() => store?.getters?.getMriFrontendConfig)
const getText = (key: string) => store?.getters?.getText?.(key) || key
const getChartSize = computed(() => store?.getters?.getChartSize)
const getCsvFireDownload = computed(() => store?.getters?.getCsvFireDownload)
const getChartProperty = (property: any) => store?.getters?.getChartProperty?.(property)
const getKMDisplayInfo = computed(() => store?.getters?.getKMDisplayInfo)
const getKMFirstLoad = computed(() => store?.getters?.getKMFirstLoad)
const getFireRequest = computed(() => store?.getters?.getFireRequest)
const getBookmarksData = computed(() => store?.getters?.getBookmarksData)
const translate = (data: any) => store?.getters?.translate?.(data) || data
const processResponseGetter = (data: any) => store?.getters?.processResponse?.(data) || data

// Methods from Vuex actions
const ajaxAuth = (config: any) => store?.dispatch('ajaxAuth', config)
const setAxisValue = (payload: any) => store?.dispatch('setAxisValue', payload)
const fireQuery = () => store?.dispatch('fireQuery')
const disableAllAxesandProperties = () => store?.dispatch('disableAllAxesandProperties')
const setTicks = (payload: any) => store?.dispatch('setTicks', payload)
const setTicksData = (payload: any) => store?.dispatch('setTicksData', payload)
const setCurrentPatientCount = (payload: any) => store?.dispatch('setCurrentPatientCount', payload)
const setKMLegends = (payload: any) => store?.dispatch('setKMLegends', payload)
const setKMFirstLoad = (payload: any) => store?.dispatch('setKMFirstLoad', payload)
const setChartPropertyValue = (payload: any) => store?.dispatch('setChartPropertyValue', payload)

// Reactive state
const chartData = ref<any>({})
const series = ref<any[]>([])
const errorMessage = ref('')
const maxDataday = ref(0)
const maxDay = ref(0)
const minDay = ref(0)
const minProb = ref(0.0)
const xScale = ref<any>(0)
const yScale = ref<any>(0)
const showTooltip = ref(false)
const tooltipPosition = ref<any>({})
const tooltipCategories = ref<any[]>([])
const tooltipMeasures = ref<any[]>([])
const showCensoring = ref(props.censoring)
const showErrorLines = ref(props.errorLines)
const rangeSliderValue = ref([0, 0])
const cachedRangeSliderValue = ref([0, 0])
const sliderHoverState = ref(false)
const tooltipHoverState = ref(false)
const tooltipFocusLeft = ref(false)
const tooltipFocusRight = ref(false)
const sliderWidth = ref(0)
const kmInterval = ref('')
const kmUnit = ref('years')
const showKMStatisticsPopup = ref(false)
const showKMStatisticsErrPopupForMoreCurves = ref(false)
const showKMStatisticsErrPopupForOneCurve = ref(false)
const showKMLogRankHelpPopOverHover = ref(false)
const showKMLogRankHelpPopOverIcon = ref(false)
const showKMLogRankHelpPopOver = ref(false)
const globalPValue = ref('')
const allCurves = ref<any>({})
const kmLogRankHelpPopoverPosition = ref<any>({
  right: '8px',
})
const kmLogRankHelpArrowPosition = ref<any>({
  left: '270px',
})
const showSubComponents = ref(false)
const kmStartEv = ref('')
const kmStartEvOcc = ref('')
const kmEndEv = ref('')
const kmEndEvOcc = ref('')
const selectedAxis = ref<any>({
  x: {},
  y: {},
})

// Template refs
const kmChart = ref<any>(null)
const chart = ref<any>(null)
const slider = ref<any>(null)
const info = ref<any>(null)
const kmLogRankHelp = ref<any>(null)

// Computed properties
const kmEndEventModel = computed(() => getChartProperty(Constants.MRIChartProperties.KMEndEvent))
const kmStartEventModel = computed(() => getChartProperty(Constants.MRIChartProperties.KMStartEvent))
const sliderMaxRange = computed(() => (maxDataday.value ? maxDataday.value : 0))
const kmLogRankValue = computed(() => {
  const data = chartData.value
  if (
    data &&
    data.logRankTestResults &&
    data.logRankTestResults.overallResult &&
    data.logRankTestResults.overallResult.pValue
  ) {
    return data.logRankTestResults.overallResult.pValue
  }
  return '0'
})
const getCurves = computed(() => {
  const data = chartData.value
  const pairResults = data.kaplanMeierStatistics?.curvePairResults

  if (pairResults) {
    Object.keys(pairResults).forEach(key => {
      const { outerEl, outerElTitle, innerEl, innerElTitle } = pairResults[key]
      if (!allCurves.value[outerEl]) {
        allCurves.value[outerEl] = {
          title: outerElTitle,
        }
      }
      if (!allCurves.value[innerEl]) {
        allCurves.value[innerEl] = {
          title: innerElTitle,
        }
      }
    })
  }
  return allCurves.value
})

// Methods
const buildRequest = () => {
  const kmRequest = JSON.parse(JSON.stringify(getBookmarksData.value))
  const kmEndEvent = kmEndEventModel.value
  const kmStartEvent = kmStartEventModel.value
  if (kmEndEvent && kmEndEvent.props && kmEndEvent.props.value) {
    kmRequest.kmEndEventIdentifier = kmEndEvent.props.value.kmEndEventIdentifier
    kmRequest.kmEndEventOccurence = kmEndEvent.props.value.kmEndEventOccurence
  }

  if (!kmRequest.kmEndEventIdentifier) {
    kmRequest.kmEndEventIdentifier = 'patient.dateOfDeath'
  }

  if (!kmRequest.kmEndEventOccurence) {
    kmRequest.kmEndEventOccurence = ''
  }

  if (kmStartEvent && kmStartEvent.props && kmStartEvent.props.value) {
    kmRequest.kmEventIdentifier = kmStartEvent.props.value.kmEventIdentifier
    kmRequest.kmStartEventOccurence = kmStartEvent.props.value.kmStartEventOccurence
  }

  if (!kmRequest.kmEventIdentifier) {
    kmRequest.kmEventIdentifier = 'patient.dateOfBirth'
  }

  if (!kmRequest.kmStartEventOccurence) {
    kmRequest.kmStartEventOccurence = 'start_min'
  }
  return kmRequest
}

const zoom = (day: number, factor: number) => {
  if (day > 0) {
    let minday = minDay.value
    let maxday = maxDay.value
    const width = maxday - minday

    minday = Math.floor(day * (1.0 - factor) + factor * minday)
    maxday = Math.ceil(minday + factor * width)

    if (minday < 0) {
      minday = 0
    }

    if (maxday > maxDataday.value) {
      maxday = maxDataday.value
    }

    if (minday > maxday) {
      minday = maxday
    }

    const newRangeSliderValue = [minday, maxday]
    rangeSliderValue.value = newRangeSliderValue
  }
}

const mousewheelHandler = (event: any) => {
  event.stopImmediatePropagation()

  const zoomScrollArea = chart.value.getBoundingClientRect()
  const xScroll = event.clientX
  const yScroll = event.clientY

  if (
    zoomScrollArea.left <= xScroll &&
    zoomScrollArea.right >= xScroll &&
    zoomScrollArea.top <= yScroll &&
    zoomScrollArea.bottom >= yScroll
  ) {
    event.stopImmediatePropagation()

    const offsetX = xScroll - zoomScrollArea.left
    const day = xScale.value.invert(offsetX)
    let normalizedDelta = 0 // positive = UP, negative = DOWN
    if (event.detail) {
      normalizedDelta = -event.detail / 3
    } else if (event.wheelDelta) {
      normalizedDelta = event.wheelDelta / 120
    }
    if (normalizedDelta > 0) {
      zoom(day, 0.75)
    } else if (normalizedDelta < 0) {
      zoom(day, 1.0 / 0.75)
    }
  }
}

const logRankMouseIn = () => {
  showKMLogRankHelpPopOverHover.value = true
}

const logRankMouseOut = () => {
  showKMLogRankHelpPopOverHover.value = false
}

const translateSeries = (chartData: any) => {
  if (chartData) {
    const duplicateResponse = JSON.parse(JSON.stringify(chartData))
    return translate(duplicateResponse.data)
  }
  return []
}

const updateUnit = (event: any) => {
  const newUnit = getUnitInfo(event.newKey)
  if (kmInterval.value) {
    const oldUnit = getUnitInfo(event.oldKey)
    kmInterval.value = String((+kmInterval.value * newUnit.avgDaysInUnit) / oldUnit.avgDaysInUnit)
  }
  cachedRangeSliderValue.value[0] = Math.round((rangeSliderValue.value[0] * 100) / newUnit.avgDaysInUnit) / 100
  cachedRangeSliderValue.value[1] = Math.round((rangeSliderValue.value[1] * 100) / newUnit.avgDaysInUnit) / 100
  kmUnit.value = event.newKey
  renderChart()
}

const sliderHover = () => {
  sliderHoverState.value = true
}

const sliderOut = () => {
  sliderHoverState.value = false
}

const tooltipHover = () => {
  tooltipHoverState.value = true
}

const tooltipOut = () => {
  tooltipHoverState.value = false
}

const tooltipFocus = (index: number) => {
  if (index === 0) {
    tooltipFocusLeft.value = true
  }
  if (index === 1) {
    tooltipFocusRight.value = true
  }
}

const tooltipBlur = (index: number) => {
  if (index === 0) {
    tooltipFocusLeft.value = false
  }
  if (index === 1) {
    tooltipFocusRight.value = false
  }
}

const onInputClick = (event: any) => {
  if (event && event.stopPropagation) {
    event.stopPropagation()
  }
}

const updateSliderValue = (sliderIndex: number) => {
  let newValue = rangeSliderValue.value[sliderIndex]
  if (
    cachedRangeSliderValue.value &&
    (cachedRangeSliderValue.value[sliderIndex] || cachedRangeSliderValue.value[sliderIndex] === 0) &&
    !isNaN(cachedRangeSliderValue.value[sliderIndex])
  ) {
    newValue = parseFloat(cachedRangeSliderValue.value[String(sliderIndex)])

    const currentUnitInfo = getOptimalUnitInfo(minDay.value, maxDay.value)
    newValue *= currentUnitInfo.avgDaysInUnit
  }
  const newRangeSliderValue = [0, 0]
  for (let i = 0; i < 2; i += 1) {
    newRangeSliderValue[i] = i === sliderIndex ? newValue : rangeSliderValue.value[i]
  }
  if (newRangeSliderValue[0] > newRangeSliderValue[1]) {
    const temp = newRangeSliderValue[0]
    newRangeSliderValue[0] = newRangeSliderValue[1]
    newRangeSliderValue[1] = temp
  }
  rangeSliderValue.value = newRangeSliderValue
}

const sliderInputCheck = (event: any, sliderIndex: number) => {
  const evt = event || window.event
  const code = evt.which ? evt.which : evt.keyCode
  if (code === 13) {
    updateSliderValue(sliderIndex)
    evt.preventDefault()
  } else if (!((code >= 48 && code <= 57) || code === 46 || code === 69 || code === 101)) {
    // Not 0-9, e, E, or .
    evt.preventDefault()
  }
  return true
}

const intervalInputCheck = () => {
  const evt: any = event || window.event
  const code = evt.which ? evt.which : evt.keyCode
  if (code === 13) {
    evt.preventDefault()
  } else if (!((code >= 48 && code <= 57) || code === 46 || code === 69 || code === 101)) {
    // Not 0-9, e, E, or .
    evt.preventDefault()
  }
  return true
}

const resetRangeSlider = () => {
  rangeSliderValue.value = [0, maxDataday.value]
}

const setupAxes = () => {
  disableAllAxesandProperties()

  setChartPropertyValue({
    id: Constants.MRIChartProperties.KMStartEvent,
    props: {
      layoutLeft: 0,
      layoutTop: 153.7,
      layoutBottom: '',
      active: true,
    },
  })

  setChartPropertyValue({
    id: Constants.MRIChartProperties.KMEndEvent,
    props: {
      layoutLeft: 0,
      layoutTop: 293.5,
      layoutBottom: '',
      active: true,
    },
  })

  const iLevelHeight = 41
  for (let i = 0; i <= Constants.MRIChartDimensions.X3; i += 1) {
    setAxisValue({
      id: i,
      props: {
        layoutLeft: '0px',
        layoutTop: '',
        layoutBottom: `${20 + i * iLevelHeight}px`,
        icon: { 0: '', 1: '', 2: '' }[i],
        iconFamily: 'app-MRI-icons',
        isCategory: true,
        isMeasure: false,
        active: true,
      },
    })
  }
}

const selectOptimalUnitForInterval = (minDay: number, maxDay: number) => {
  const keysSortedByUnitLength = Object.keys(UNIT_DATA).sort((a, b) => {
    const aUnitNo = UNIT_DATA[a].avgDaysInUnit
    const bUnitNo = UNIT_DATA[b].avgDaysInUnit
    if (aUnitNo < bUnitNo) {
      return -1
    }
    if (aUnitNo > bUnitNo) {
      return 1
    }
    return 0
  })
  if (typeof minDay !== 'number' || typeof maxDay !== 'number') {
    return keysSortedByUnitLength[keysSortedByUnitLength.length - 1]
  }
  if (minDay > maxDay) {
    throw new Error(`The start of the interval (${minDay}) is smaller than the end (${maxDay})!`)
  }
  const lengthInDays = maxDay - minDay
  const allowedUnitLabels = keysSortedByUnitLength.filter(unitKey => {
    const currentRangeLimit = UNIT_DATA[unitKey].upperRangeLimit
    return typeof currentRangeLimit !== 'number' || lengthInDays <= currentRangeLimit
  })
  if (allowedUnitLabels.length === 0) {
    throw new Error(`No allowed unit found for the interval (${minDay},${maxDay})!`)
  }
  const smallestAllowedUnitLabel = allowedUnitLabels[0]
  return smallestAllowedUnitLabel
}

const getUnitInfo = (unitLabel: string) => {
  return UNIT_DATA[unitLabel]
}

const getOptimalUnitInfo = (minDay: number, maxDay: number) => {
  let unitKey = kmUnit.value
  if (!unitKey) {
    unitKey = selectOptimalUnitForInterval(minDay, maxDay)
  }
  const unitInfo = getUnitInfo(unitKey)
  return unitInfo
}

const genericDayFormatter = (days: number, unitInfo: any, unitLabelIsNeeded: boolean) => {
  if (typeof days !== 'number') {
    return ''
  }
  const convertedValue = days / unitInfo.avgDaysInUnit
  let returnString = convertedValue.toFixed(unitInfo.digitsAfterDecimalPoint)
  if (unitLabelIsNeeded) {
    returnString += ` ${unitInfo.label}`
  }
  return returnString
}

const getActiveDayFormatter = (unitLabelIsNeeded: boolean) => {
  const minDayVal = minDay.value
  const maxDayVal = maxDay.value
  const currentUnitInfo = getOptimalUnitInfo(minDayVal, maxDayVal)
  const formatFunc = (daysNo: number) => genericDayFormatter(daysNo, currentUnitInfo, unitLabelIsNeeded)
  return formatFunc
}

const computeCensoredPoints = (
  serie: any,
  minday: number,
  maxday: number,
  minprob: number,
  minDistance: number,
  xScaleLocal: any
) => {
  serie.mCensored = []
  if (showCensoring.value && serie.censored && serie.mPoints.length > 0) {
    // compute y values for censored data
    let j = 0
    let iClusterStart = 0
    let nClusterY = 0
    let iClusterCount = 0

    // Use some() to allow ending the loop early by returning true
    serie.censored.some((censored: any, i: number) => {
      const xvalue = censored[0]
      const iPointCount = censored[1]

      if (xvalue > maxday) {
        return true
      }
      if (iPointCount <= 0 || xvalue < minday) {
        return false
      }
      while (j < serie.mPoints.length - 1 && xvalue > serie.mPoints[j + 1][0]) {
        j += 1
      }
      const yvalue = serie.mPoints[i][1]
      if (yvalue < minprob) {
        return true
      }
      const refPoint = iClusterCount > 0 ? iClusterStart : xvalue
      const k = i + 1
      if (k < serie.censored.length && serie.mPoints[k][1] !== serie.mPoints[i][1]) {
        // Check if the interval has ended
        if (iClusterCount === 0) {
          serie.mCensored.push([xvalue, yvalue, iPointCount])
        } else {
          serie.mCensored.push([iClusterStart, nClusterY, iClusterCount])
          iClusterCount = 0
        }
      } else if (k < serie.censored.length && xScaleLocal(serie.censored[k][0]) - xScaleLocal(refPoint) < minDistance) {
        if (iClusterCount === 0) {
          iClusterStart = refPoint
          nClusterY = yvalue
          iClusterCount = iPointCount
        }
        iClusterCount += serie.censored[k][1]
      } else if (iClusterCount === 0) {
        serie.mCensored.push([xvalue, yvalue, iPointCount])
      } else {
        serie.mCensored.push([iClusterStart, nClusterY, iClusterCount])
        iClusterCount = 0
      }
      return false
    })
  }
}

const pickColor = (index: number) => {
  return [
    '#EB7300',
    '#93C939',
    '#F0AB00',
    '#960981',
    '#EB7396',
    '#E35500',
    '#4FB81C',
    '#D29600',
    '#760A85',
    '#C87396',
    '#BC3618',
    '#247230',
    '#BE8200',
    '#45157E',
    '#A07396',
  ][index % 15]
}

const processResponseMethod = (resp: any) => {
  const newResponse = JSON.parse(JSON.stringify(resp))

  newResponse.data.forEach((mData: any) => {
    props.bookmarkList.forEach((bookmark: any) => {
      if (bookmark.id === mData.cohortId) {
        mData.name = bookmark.name
        mData.cohortId = bookmark.name
      }
    })

    // Remove all entries that have a negative value for x
    // That can be caused by bad patient data (eg. DoD before DoB and interactions)
    mData.censored = mData.censored.filter((aCensor: any) => aCensor[0] >= 0)
    mData.points = mData.points.filter((aPoint: any) => aPoint[0] >= 0)
  })

  const curvePairResults = newResponse.kaplanMeierStatistics.curvePairResults
  Object.keys(curvePairResults).forEach((mData: any) => {
    props.bookmarkList.forEach((bookmark: any) => {
      if (bookmark.id === curvePairResults[mData].innerEl) {
        curvePairResults[mData].innerEl = bookmark.name
        curvePairResults[mData].innerElTitle = bookmark.name
      }
      if (bookmark.id === curvePairResults[mData].outerEl) {
        curvePairResults[mData].outerEl = bookmark.name
        curvePairResults[mData].outerElTitle = bookmark.name
      }
    })
    curvePairResults[curvePairResults[mData].innerEl + curvePairResults[mData].outerEl] = curvePairResults[mData]
  })

  newResponse.categories.forEach((mCategory: any) => {
    if (mCategory.id === 'dummy_category') {
      mCategory.name = getText('MRI_PA_DUMMY_CATEGORY')
    }
  })

  return newResponse
}

const renderChart = () => {
  if (!chart.value) {
    return
  }
  if (chart.value.firstChild) {
    chart.value.removeChild(chart.value.firstChild)
  }

  if (getKMFirstLoad.value && Object.keys(getKMFirstLoad.value).length > 0) {
    if (getKMFirstLoad.value.init) {
      showCensoring.value = false
      showErrorLines.value = false
    }

    showCensoring.value = getKMFirstLoad.value.censoring

    showErrorLines.value = getKMFirstLoad.value.errorlines

    setKMFirstLoad({ firstLoad: {} })
  }
  const height = Math.floor(chart.value.getBoundingClientRect().bottom - chart.value.getBoundingClientRect().top)
  const width = Math.floor(chart.value.getBoundingClientRect().right - chart.value.getBoundingClientRect().left)
  sliderWidth.value = (width * 90) / 100

  const ypadding = Y_PADDING
  const xpadding = X_PADDING
  const seriesLocal = series.value
  const minprob = minProb.value
  let minday = minDay.value
  let maxday = maxDay.value
  const dayFormatterNoUnitLabel = getActiveDayFormatter(false)
  const axislabelverticalpadding = 30
  const offsetVerticalSpacingXAxisUnit = 14
  const offsetHorizontalSpacingXAxisUnit = 2

  // Set the unit to optimal value
  const currentUnitInfo = getOptimalUnitInfo(minday, maxday)

  const xTicks = Math.min(width / 40, 10) // how many ticks to show on the x axis
  const yTicks = Math.min(height / 40, 10) // ... and on the y axis

  // Find the largest day no (time interval) in data set
  let iMaxdayInData = 0
  seriesLocal.forEach((serie: any) => {
    if (serie.points.length > 0) {
      const lastpoint = serie.points[serie.points.length - 1]
      iMaxdayInData = lastpoint[0] >= iMaxdayInData ? lastpoint[0] : iMaxdayInData
    }
  })

  maxDataday.value = iMaxdayInData

  // Ensure that mainday and maxday have sensible values
  if (iMaxdayInData && (typeof maxday === 'undefined' || maxday > iMaxdayInData)) {
    maxday = iMaxdayInData
    maxDay.value = maxday
  }

  if (maxday === 0) {
    maxDay.value = iMaxdayInData
    maxday = iMaxdayInData
  }

  if ((typeof maxday !== 'undefined' && minday > maxday) || minday < 0 || typeof minday === 'undefined') {
    minday = 0
    minDay.value = minday
  }

  // Set x-axis scale
  const xScaleLocal = d3.scale
    .linear()
    .domain([minday, maxday])
    .range([xpadding, width - xpadding])
  xScale.value = xScaleLocal

  // Set y-axis scale
  const yScaleLocal = d3.scale
    .linear()
    .domain([minprob, 1])
    .range([height - ypadding - axislabelverticalpadding, ypadding])
  yScale.value = yScaleLocal

  const svg = d3.select(document.createElementNS(d3.ns.prefix.svg, 'svg'))

  if (seriesLocal.length > 0) {
    const dataLines = []

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'none')
      .attr('pointer-events', 'all')
      .attr('width', width)
      .attr('height', height)

    // If we don't add an invisible rectangle that comprises the whole SVG,
    // click events to this latter won't be propagated correctly in IE.
    svg.append('rect').attr('x', 0).attr('y', 0).attr('width', width).attr('height', height).attr('fill', 'none')

    const line = d3.svg
      .line()
      .x((d: any) => xScaleLocal(d[0]))
      .y((d: any) => yScaleLocal(d[1]))
      .interpolate('step-after')

    const standardAxisFontSize = '14px'

    // Do we have enforceable TickValues?
    // For Automated Behavior, we will look at first option that
    let tickValues
    const kmIntervalVal = parseFloat(kmInterval.value)
    const bisector = d3.bisector((d: any) => d[0]).left

    if (kmIntervalVal && kmIntervalVal > 0) {
      tickValues = []
      let tickPoint = 0
      tickValues.push(minday)
      while (tickPoint <= maxday) {
        if (tickPoint > minday) {
          tickValues.push(tickPoint)
        }
        tickPoint += kmIntervalVal * currentUnitInfo.avgDaysInUnit
      }
    } else {
      for (let i = 0; i < MULTIPLIER.length; i += 1) {
        let tickPoint = 0
        tickValues = []
        tickValues.push(minday)
        while (tickPoint <= maxday) {
          if (tickPoint > minday) {
            tickValues.push(tickPoint)
          }
          tickPoint += MULTIPLIER[i] * currentUnitInfo.avgDaysInUnit
        }
        if (tickValues.length <= xTicks) {
          break
        }
      }
    }

    // X-axis
    const xAxis = d3.svg
      .axis()
      .scale(xScaleLocal)
      .tickFormat(dayFormatterNoUnitLabel)
      .tickSize(6, 10)
      .tickValues(tickValues)
      .ticks(xTicks)
    svg
      .append('g')
      .attr('class', 'axis kmXAxis')
      .attr('transform', `translate(0,${height - ypadding - axislabelverticalpadding})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'middle')
      .style('font-size', standardAxisFontSize)
      .style('font-style', currentUnitInfo.fontStyle)
      .style('font-weight', currentUnitInfo.fontWeight)
      .attr('dy', '1em')

    // Add x-axis label
    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr(
        'transform',
        `translate(${width / offsetHorizontalSpacingXAxisUnit},${height - offsetVerticalSpacingXAxisUnit})`
      )
      .style('font-size', standardAxisFontSize)
      .style('font-style', currentUnitInfo.fontStyle)
      .style('font-weight', currentUnitInfo.fontWeight)
      .text(getText(currentUnitInfo.label))
      .attr('dy', '.2em')

    // Y-axis
    const yAxis = d3.svg.axis().scale(yScaleLocal).orient('left').tickFormat(d3.format('p%')).ticks(yTicks)
    svg
      .append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(${xpadding},0)`)
      .call(yAxis)
      .selectAll('text')
      .style('font-size', standardAxisFontSize)

    // Add grid (Horizontal lines)
    const gridYAxis = d3.svg
      .axis()
      .scale(yScaleLocal)
      .orient('left')
      .ticks(yTicks)
      .tickSize(-(width - 2 * xpadding), 0)
      .tickFormat('')
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${xpadding},0)`).call(gridYAxis)

    seriesLocal.forEach((s: any, i: number) => {
      if (!s.mColor) {
        s.mColor = pickColor(i)
      }
    })

    // Draw actual curves
    seriesLocal.forEach((serie: any, i: number) => {
      if (serie.points.length === 0) {
        return
      }
      // compute y values for censored data points
      serie.mPoints = serie.points.slice(0)
      // consoring events within this interval from each other will get a numeric label
      const iMinDistance = 10
      computeCensoredPoints(serie, minday, maxday, minprob, iMinDistance, xScaleLocal)

      // fix extremes by adding extra points
      // FIX LEFT-HAND SIDE: remove all points before minday.
      // Then, if first point does not has X=minday, add an extra point (0,firstpoint.Y)
      let j = 0
      while (j < serie.mPoints.length && serie.mPoints[j][0] < minday) {
        j += 1
      }
      serie.mPoints.splice(0, j)

      if (serie.mPoints.length > 0 && serie.mPoints[0][0] !== minday) {
        const newpoint = serie.mPoints[0].slice(0)
        newpoint[0] = minday
        serie.mPoints.splice(0, 0, newpoint)
      }

      // FIX RIGHT-HAND SIDE:
      // remove points (X,Y) with X > maxday || Y < minprob
      j = serie.mPoints.length - 1
      while (j > 0 && (serie.mPoints[j][0] > maxday || serie.mPoints[j][1] < minprob)) {
        j -= 1
      }
      serie.mPoints.splice(j + 1, serie.mPoints.length - j - 1)

      // Draw curves
      svg
        .append('g')
        .attr('class', 'curve')
        .append('path')
        .style('stroke', serie.mColor)
        .style('pointer-events', 'stroke')
        .attr('d', line(serie.mPoints))

      svg
        .append('g')
        .attr('class', 'shadow-curve')
        .append('path')
        .style('pointer-events', 'stroke')
        .style('opacity', 0)
        .style('stroke-width', 2)
        .attr('d', line(serie.mPoints))
        .attr('series', i)
        .on('mouseenter', () => {
          const seriesKey = d3.event.currentTarget.getAttribute('series')
          const gridElement = document.querySelector('g.grid')
          const gLeft = gridElement.getBoundingClientRect().left
          const cX = d3.event.clientX
          const cY = d3.event.clientY
          let mouseX = cX - gLeft + xpadding
          if (mouseX < xpadding) {
            mouseX = xpadding
          }
          const seriesData = seriesLocal[seriesKey]
          const data = seriesData.mPoints
          const approximateXDomainValue = Math.round(xScaleLocal.invert(mouseX))

          const position = bisector(data, approximateXDomainValue)
          const larger = data[position]
          const smaller = data[position - 1]

          // use the x value derived from the mouse coordinate x position
          // also convert x value to the current x axis unit
          const currentUnit = getUnitInfo(kmUnit.value)
          const daysInUnit = currentUnit.avgDaysInUnit
          const xValUnit = currentUnit.unitLabel
          const decimalPlaces = currentUnit.digitsAfterDecimalPoint
          const xVal = (approximateXDomainValue / daysInUnit).toFixed(decimalPlaces)
          const finalValueSet: any = { x: xVal }
          // compare which data x value is closest to x value derived from mouse x position
          let finalElement

          finalElement = smaller || larger

          finalValueSet.y = finalElement[1]
          finalValueSet.underRisk = finalElement[3]

          tooltipPosition.value = {
            left: `${cX + 10}px`,
            top: `${cY + 10}px`,
            position: 'fixed',
          }

          showTooltip.value = true

          tooltipCategories.value = [
            {
              bg: seriesData.mColor,
              value: seriesData.name,
            },
          ]

          tooltipMeasures.value = [
            {
              name: getText('MRI_PA_KAPLAN_TLTIP_PATIENTS_LABEL'),
              value: seriesData.pcount.toLocaleString(),
            },
            {
              name: `${getText('MRI_PA_KAPLAN_TLTIP_SURVIVAL_PERIOD_LABEL')} (${getText(xValUnit)}):`,
              value: finalValueSet.x.toLocaleString(),
            },
            {
              name: getText('MRI_PA_KAPLAN_TLTIP_PROBABILITY_LABEL'),
              value: `${(finalValueSet.y * 100).toFixed(2)}%`,
            },
            {
              name: getText('MRI_PA_KAPLAN_TLTIP_NUMBER_AT_RISK_LABEL'),
              value: finalValueSet.underRisk.toLocaleString(),
            },
          ]
        })
        .on('mouseleave', () => {
          showTooltip.value = false
        })

      // Draw uncertainty intervcal
      if (
        showErrorLines.value &&
        (serie.errorlines || typeof serie.errorlines === 'undefined') &&
        serie.mPoints.length > 0 &&
        serie.mPoints[0].length > 2
      ) {
        const d3upperErrorLine = d3.svg
          .line()
          .x((d: any) => xScaleLocal(d[0]))
          .y((d: any) => (d.length > 2 ? yScaleLocal(Math.min(d[1] + d[2], 1.0)) : yScaleLocal(d[1])))
          .interpolate('step-after')

        const d3lowerErrorLine = d3.svg
          .line()
          .x((d: any) => xScaleLocal(d[0]))
          .y((d: any) => (d.length > 2 ? yScaleLocal(Math.max(d[1] - d[2], minprob)) : yScaleLocal(d[1])))
          .interpolate('step-after')

        svg
          .append('g')
          .attr('class', 'error-curve')
          .append('path')
          .style('stroke', serie.mColor)
          .attr('d', d3upperErrorLine(serie.mPoints))

        svg
          .append('g')
          .attr('class', 'error-curve')
          .append('path')
          .style('stroke', serie.mColor)
          .attr('d', d3lowerErrorLine(serie.mPoints))
      }

      // Add censoring events
      if (serie.mCensored.length > 0) {
        svg
          .append('g')
          .style('stroke', serie.mColor)
          .style('fill', 'none')
          .selectAll('line')
          .data(serie.mCensored)
          .enter()
          .append('line')
          .attr('x1', (d: any) => xScaleLocal(d[0]))
          .attr('y1', (d: any) => yScaleLocal(d[1] - 0.02))
          .attr('x2', (d: any) => xScaleLocal(d[0]))
          .attr('y2', (d: any) => yScaleLocal(d[1] + 0.01))

        // Cluster number Text for censoring ticks
        svg
          .append('g')
          .attr('class', 'censored-label')
          .selectAll('text')
          .data(serie.mCensored.filter((el: any) => el[2] > 1))
          .enter()
          .append('text')
          .attr('x', (d: any) => xScaleLocal(d[0]))
          .attr('y', (d: any) => yScaleLocal(d[1]))
          .attr('dy', -6)
          .attr('text-anchor', 'start')
          .style('fill', serie.mColor)
          .text((d: any) => d[2])
      }
      dataLines.push(serie)
    })

    // Store Tick Values in States
    if (tickValues && tickValues.length > 0) {
      const tickData = []
      for (let i = 0; i < seriesLocal.length; i += 1) {
        const data = seriesLocal[i].mPoints
        const dataForSeries = []
        for (let ii = 0; ii < tickValues.length; ii += 1) {
          const tickValue = tickValues[ii]
          const position = bisector(data, tickValue)
          const larger = data[position]
          const smaller = data[position - 1]

          // use the x value derived from the mouse coordinate x position
          const finalValueSet: any = { x: tickValue }
          // compare which data x value is closest to x value derived from mouse x position
          let finalElement

          finalElement = smaller || larger

          finalValueSet.y = finalElement ? finalElement[1] : 'NoData'
          finalValueSet.underRisk = finalElement ? finalElement[3] : 'NoData'
          dataForSeries.push(
            finalElement ? `${Math.round(finalElement[1] * 10000) / 100}% (${finalElement[3]})` : 'NoData'
          )
        }
        tickData.push(dataForSeries)
      }
      setTicksData({ kmTicksData: tickData })
      const kmTickType = currentUnitInfo
      const kmTicks = tickValues.map(
        (val: number) => `${Math.round((val / currentUnitInfo.avgDaysInUnit) * 100) / 100}`
      )
      setTicks({ kmTickType, kmTicks })
    }
  }

  let newypos = 0
  let newxpos = 0
  let ypos
  let xpos
  let maxwidth = 0
  const maxlegendwidth = MAX_LEGEND_WIDTH

  d3.select(kmChart.value)
    .selectAll('.label-slot')
    .attr('transform', function todo2() {
      const length = d3.select(this).select('text').node().getComputedTextLength() + 30
      xpos = newxpos
      ypos = newypos
      if (maxlegendwidth < xpos + length) {
        xpos = 0
        newxpos = 0
        newypos += 20
        ypos = newypos
      }
      newxpos += length
      if (newxpos > maxwidth) {
        maxwidth = newxpos
      }
      return `translate(${xpos},${ypos})`
    })

  ypos = Y_PADDING + 20
  xpos =
    Math.floor(chart.value.getBoundingClientRect().right - chart.value.getBoundingClientRect().left) -
    X_PADDING -
    maxwidth
  // position legend as far right as possible within the total width
  d3.select(kmChart.value).select('.label-area').attr('transform', `translate(${xpos},${ypos})`)

  chart.value.appendChild(svg.node())
}

const openKMStatisticsPopup = () => {
  const data = chartData.value
  if (data && data.data) {
    if (data.data.length > 5) {
      showKMStatisticsErrPopupForMoreCurves.value = true
    } else if (data.data.length === 1) {
      showKMStatisticsErrPopupForOneCurve.value = true
    } else {
      allCurves.value = {}
      showKMStatisticsPopup.value = true
    }
  }
}

const openKMLogRankHelpPopOver = () => {
  kmLogRankHelpPopoverPosition.value.top = `${kmLogRankHelp.value.getBoundingClientRect().bottom + 16}px`
  showKMLogRankHelpPopOver.value = true
}

const closeKMStatisticsPopup = () => {
  showKMStatisticsPopup.value = false
}

const closeKMStatisticsErrPopupForMoreCurves = () => {
  showKMStatisticsErrPopupForMoreCurves.value = false
}

const closeKMStatisticsErrPopupForOneCurve = () => {
  showKMStatisticsErrPopupForOneCurve.value = false
}

const formatPValue = (val: string) => {
  return `${getText('MRI_PA_KAPLAN_LOG_RANK_P')}${val}`
}

const getGlobalDoF = () => {
  const data = chartData.value
  if (data.kaplanMeierStatistics.overallResult.dof) {
    return data.kaplanMeierStatistics.overallResult.dof
  } else {
    return ''
  }
}

const getLowerAxisProperties = () => {
  const xAxisProperties = [
    {
      chart: 'bar',
      type: 'x',
      order: 0,
      layoutLeft: 0,
      layoutTop: 0,
      layoutBottom: 60,
      icon: '',
      iconFamily: '',
      active: true,
      isCategory: true,
      isMeasure: false,
      axisPropertyTooltip: selectedAxis.value.x.axisPropertyTooltip,
      axisPropertyText: selectedAxis.value.x.axisPropertyText,
      axisAttrText: selectedAxis.value.x.axisAttrText,
    },
  ]
  return xAxisProperties
}

const setUpSelectedAxis = () => {
  const config = getMriFrontendConfig.value
  const axes = [
    { name: 'x', val: props.xAxes },
    { name: 'y', val: props.yAxis },
  ]
  axes.forEach((axis: any) => {
    if (axis.val) {
      const filterCardName = config.getFilterCardByPath(config.getAttributeByPath(axis.val).sParentPath)
        .oInternalConfigFilterCard.name
        ? config.getFilterCardByPath(config.getAttributeByPath(axis.val).sParentPath).oInternalConfigFilterCard.name
        : getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
      const attributeName = config.getAttributeByPath(axis.val).oInternalConfigAttribute.name
      selectedAxis.value[axis.name].axisPropertyText = filterCardName
      selectedAxis.value[axis.name].axisAttrText = attributeName
      selectedAxis.value[axis.name].axisPropertyTooltip = filterCardName + ' - ' + attributeName
    } else {
      selectedAxis.value[axis.name].axisPropertyText = getText('MRI_PA_CHART_AXIS_PLACEHOLDER')
      selectedAxis.value[axis.name].axisAttrText = ''
      selectedAxis.value[axis.name].axisPropertyTooltip = ''
    }
  })
}

const fireCompareRequest = () => {
  const configMetadata = getMriFrontendConfig.value.getConfigMetadata()

  emit('response', null)
  emit('busyEv', true)
  const cancelToken = new CancelToken((c: any) => {
    cancel = c
  })
  const callback = (chartDataResponse: any) => {
    const data = chartDataResponse.data
    showSubComponents.value = false
    chartData.value = processResponseMethod(data)
    series.value = []
    setCurrentPatientCount({
      currentPatientCount: data.totalPatientCount,
    })
    errorMessage.value = chartData.value.noDataReason ?? ''

    if (!errorMessage.value) {
      if (
        chartData.value &&
        chartData.value.kaplanMeierStatistics &&
        chartData.value.kaplanMeierStatistics.overallResult &&
        chartData.value.kaplanMeierStatistics.overallResult.pValue
      ) {
        if (chartData.value.kaplanMeierStatistics.overallResult.pValue === '--') {
          showKMLogRankHelpPopOverIcon.value = true
          globalPValue.value = chartData.value.kaplanMeierStatistics.overallResult.pValue
        } else {
          showKMLogRankHelpPopOverIcon.value = false
          globalPValue.value = formatPValue(chartData.value.kaplanMeierStatistics.overallResult.pValue)
        }
      } else {
        showKMLogRankHelpPopOverIcon.value = false
        globalPValue.value = formatPValue(' = 0')
      }
      series.value = translateSeries(chartData.value)
      /* categories will always be more than 1 if there is an x axis selected.
             this will get the x axis to assemble the legend and get the attribute name
          */
      series.value.forEach(item => {
        if (chartData.value.categories.length > 1 && item[chartData.value.categories[0].id]) {
          item.name = item[chartData.value.categories[0].id] + ', ' + item.name
        }
      })
      if (chartData.value.categories.length > 1) {
        chartData.value.categories[0].name = getMriFrontendConfig.value.getAttributeByPath(
          chartData.value.categories[0].id
        ).oInternalConfigAttribute.name
      }
      setKMLegends({
        categories: chartData.value.categories,
        series: series.value,
      })
      renderChart()
      resetRangeSlider()
      showSubComponents.value = true
    }

    // hardcode to a positive value as png download expects this value
    chartData.value.totalPatientCount = 1
    emit('response', chartData.value)
    emit('busyEv', false)
  }

  ajaxAuth({
    method: 'get',
    url:
      '/analytics-svc/api/services/patient/cohorts/compare/km?' +
      'ids=' +
      props.bookmarkList.map(e => e.id).join(',') +
      '&xaxis=' +
      props.xAxes +
      '&yaxis=' +
      props.yAxis +
      '&configId=' +
      configMetadata.configId +
      '&configVersion=' +
      configMetadata.configVersion +
      '&kmstartevent=' +
      kmStartEv.value +
      '&kmeventofinterest=' +
      kmEndEv.value +
      '&kmstarteventocc=' +
      kmStartEvOcc.value +
      '&kmeventofinterestocc=' +
      kmEndEvOcc.value,
    cancelToken,
  })
    .then(callback)
    .catch(({ message, response }: any) => {
      if (message !== 'cancel') {
        emit('busyEv', false)
      }
      errorMessage.value = message
      if (response && response.status === 500) {
        callback({
          data: [],
          measures: [],
          categories: [],
          totalPatientCount: 0,
          noDataReason: response.data.errorMessage,
        })
      }
    })
  emit('busyEv', true)
}

// Watchers
watch(
  () => props.xAxes,
  val => {
    if (val) {
      fireCompareRequest()
    }
  }
)

watch(
  () => props.yAxis,
  val => {
    if (val) {
      fireCompareRequest()
    }
  }
)

watch(
  () => props.kmStartEvent,
  val => {
    if (val) {
      kmStartEv.value = val
      fireCompareRequest()
    }
  }
)

watch(
  () => props.kmStartEventOccurence,
  val => {
    if (val) {
      kmStartEvOcc.value = val
      fireCompareRequest()
    }
  }
)

watch(
  () => props.kmEndEvent,
  val => {
    if (val) {
      kmEndEv.value = val
      fireCompareRequest()
    }
  }
)

watch(
  () => props.kmEndEventOccurence,
  val => {
    if (val) {
      kmEndEvOcc.value = val
      fireCompareRequest()
    }
  }
)

watch(
  () => props.censoring,
  val => {
    showCensoring.value = val
    renderChart()
  }
)

watch(
  () => props.errorLines,
  val => {
    showErrorLines.value = val
    renderChart()
  }
)

watch(rangeSliderValue, (newVal, oldVal) => {
  if (newVal && oldVal && (newVal[0] !== oldVal[0] || newVal[1] !== oldVal[1])) {
    minDay.value = newVal[0]
    maxDay.value = newVal[1]
    const currentUnitInfo = getOptimalUnitInfo(minDay.value, maxDay.value)
    cachedRangeSliderValue.value[0] = Math.round((newVal[0] * 100) / currentUnitInfo.avgDaysInUnit) / 100
    cachedRangeSliderValue.value[1] = Math.round((newVal[1] * 100) / currentUnitInfo.avgDaysInUnit) / 100
    renderChart()
  }
})

// Lifecycle hooks
onMounted(() => {
  setupAxes()
  setUpSelectedAxis()
  emit('lowerAxisMenu', getLowerAxisProperties())
  window.addEventListener('resize', renderChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', renderChart)
  if (cancel) {
    cancel()
  }
})
</script>
