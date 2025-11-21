<template>
  <div class="boxplot-container">
    <div class="boxplot-chart" id="boxplotCompare-chart" ref="boxPlotchart"></div>
    <chartPopover v-if="showTooltip && !showTooltipButton" :position="tooltipPosition" @blur="hideTooltip">
      <template v-slot:body>
        <div>
          <boxplotInfo
            :tooltipCategories="tooltipCategories"
            :tooltipMeasures="tooltipMeasures"
            :tooltipPatientCount="tooltipPatientCount"
            :selection="selection"
          />
        </div>
      </template>
    </chartPopover>
    <chartErrorMessage :errorMessage="errorMessage"></chartErrorMessage>
  </div>
</template>

<script lang="ts">
export default {
  name: 'boxplotChart',
  compatConfig: { MODE: 3 },
}
</script>

<script setup lang="ts">
import d3 from 'd3'
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
import Constants from '../utils/Constants'
import boxplotInfo from './BoxplotInfo.vue'
import chartErrorMessage from './ChartErrorMessage.vue'
import ChartPopover from './ChartPopover.vue'

/** @constant {Number} Padding */
const PADDING = 24

/** @constant {Number} Space for the Y-Axis. */
const Y_AXIS_PADDING = 38

/** @constant {Number} Width of the Y-Axis tick marks. */
const Y_AXIS_TICK = 5

/** @constant {Number} Padding below X-Axis. */
const X_AXIS_BASE_PADDING = 14

/** @constant {Number} Height of each level of X-Axis labels. */
const X_AXIS_DIMENSION_PADDING = 24

/** @constant {Number} Range Band Padding. (Proportion of Band that is padding) */
const RANGE_BAND_PADDING = 0.3

/** @constant {Number} Max width of a Box. */
const BOX_MAX_WIDTH = 24

/** @constant {Array} List of translatable keys for the Boxplot values. */
const VALUE_KEY_LIST = ['MRI_PA_MIN_VAL', 'MRI_PA_Q1', 'MRI_PA_MEDIAN', 'MRI_PA_Q3', 'MRI_PA_MAX_VAL']

const CancelToken = axios.CancelToken
let cancel: any

interface Props {
  busyEv?: boolean
  bookmarkList?: any[]
  xAxes?: string
  yAxis?: string
}

const props = withDefaults(defineProps<Props>(), {
  busyEv: false,
  bookmarkList: () => [],
  xAxes: '',
  yAxis: '',
})

const emit = defineEmits<{
  busyEv: [value: boolean]
  drilldown: []
  upperAxisMenu: [properties: any]
  lowerAxisMenu: [properties: any]
}>()

const store = useStore()

const getActiveAxes = computed(() => store?.getters?.getActiveAxes)
const getMriFrontendConfig = computed(() => store?.getters?.getMriFrontendConfig)
const getText = (key: string) => store?.getters?.getText?.(key) || key
const processResponse = computed(() => store?.getters?.processResponse)

// Reactive state
const errorMessage = ref('')
const selection = ref<any[]>([])
const showTooltip = ref(false)
const showTooltipButton = ref(false)
const tooltipPosition = ref<any>({})
const tooltipCategories = ref<any[]>([])
const tooltipMeasures = ref<any[]>([])
const tooltipPatientCount = ref(0)
const boxplotChartStyle = ref<any>({})
const chartData = ref<any>({})
const selectedAxis = ref<any>({
  x: {},
  y: {},
})
const boxPlotchart = ref<any>(null)
const tooltipButtonPosition = ref<any>({})

// Methods
const ajaxAuth = (config: any) => store?.dispatch('ajaxAuth', config)

const fireCompareRequest = () => {
  const configMetadata = getMriFrontendConfig.value.getConfigMetadata()

  emit('busyEv', true)
  const cancelToken = new CancelToken((c: any) => {
    cancel = c
  })

  const callback = (response: any) => {
    if (!response.noDataReason && !response.data.errorMessage) {
      errorMessage.value = ''
    }

    chartData.value = response.data
    renderChart()
    emit('busyEv', false)
  }

  ajaxAuth({
    method: 'get',
    url:
      '/analytics-svc/api/services/patient/cohorts/compare/boxplot?' +
      'ids=' +
      props.bookmarkList.map((e: any) => e.id).join(',') +
      '&xaxis=' +
      props.xAxes +
      '&yaxis=' +
      props.yAxis +
      '&configId=' +
      configMetadata.configId +
      '&configVersion=' +
      configMetadata.configVersion,
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

const renderChart = () => {
  const newResponse = chartData.value

  // change name of bookmark id to bookmark name in data
  newResponse.data?.forEach((data: any) => {
    props.bookmarkList.forEach((bookmark: any) => {
      if (bookmark.id === data.cohortId) {
        data.cohortId = bookmark.name
      }
    })
  })

  d3.select(boxPlotchart.value).select('svg').remove()
  if (
    !newResponse ||
    !newResponse.data ||
    !newResponse.categories ||
    !(Array.isArray(newResponse.data) && newResponse.data.length) ||
    !(Array.isArray(newResponse.categories) && newResponse.categories.length) ||
    !boxPlotchart.value?.parentElement
  ) {
    if (newResponse && newResponse.noDataReason) {
      errorMessage.value = newResponse.noDataReason
    }
    return
  }
  errorMessage.value = ''

  const aDimensions = newResponse.categories.concat().reverse()
  let iHeight = boxPlotchart.value.parentElement.offsetHeight
  let iWidth = boxPlotchart.value.parentElement.offsetWidth

  if (boxplotChartStyle.value && boxplotChartStyle.value.width) {
    iWidth = boxplotChartStyle.value.width
  }

  if (boxplotChartStyle.value && boxplotChartStyle.value.height) {
    iHeight = boxplotChartStyle.value.height
  }

  const iPlotHeight = iHeight - (X_AXIS_BASE_PADDING + X_AXIS_DIMENSION_PADDING * aDimensions.length) - PADDING * 2
  const iPlotWidth = iWidth - Y_AXIS_PADDING - PADDING * 2

  aDimensions.forEach((mDimension: any) => {
    mDimension.values = []
    newResponse.data.forEach((mData: any) => {
      const sValue = mData[mDimension.id]
      if (!mDimension.values.length || mDimension.values[mDimension.values.length - 1] !== sValue) {
        mDimension.values.push(sValue)
      }
    })
    mDimension.xScale = d3.scale.ordinal().domain(Object.keys(mDimension.values)).rangeBands([0, iPlotWidth])
  })

  // Calculate a range for the Y-Scale
  const iMax = d3.max(newResponse.data, (mData: any) => (mData.values[4] === 'NoValue' ? -Infinity : mData.values[4]))
  const iMin = d3.min(newResponse.data, (mData: any) => (mData.values[0] === 'NoValue' ? Infinity : mData.values[0]))

  const iDeltaPadding = (iMax - iMin) * 0.1 || iMax * 0.05

  // Define the Y-Scale
  const d3yScale = d3.scale
    .linear()
    .domain([iMin - iDeltaPadding, iMax + iDeltaPadding])
    .range([iPlotHeight, 0])
    .nice(10)

  // Define the Y-Axis
  const d3yAxis = d3.svg
    .axis()
    .scale(d3yScale)
    .orient('left')
    .tickFormat((iNumber: any) => iNumber)
    .tickSize(-Y_AXIS_TICK, -Y_AXIS_TICK)

  // Define the X-Scale for the Boxes
  const d3xValueScale = d3.scale
    .ordinal()
    .domain(newResponse.data.map((_val: any, iValueIndex: number) => iValueIndex))
    .rangeBands([0, iPlotWidth], RANGE_BAND_PADDING, RANGE_BAND_PADDING / 2)

  const d3svg = d3
    .select(boxPlotchart.value)
    .append('svg')
    .classed(getClass('Selection'), selection.value.length > 0)
    .attr('width', iWidth)
    .attr('height', iHeight)

  // Add the Background
  d3svg
    .append('svg:rect')
    .classed(getClass('Background'), true)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', iWidth)
    .attr('height', iHeight)
    .on('click', () => {
      newResponse.data.forEach((mSelectedData: any) => {
        delete mSelectedData.selected
      })
      updateSelection()
    })

  // Add a main group and translate for padding
  const d3main = d3svg.append('svg:g').attr('transform', `translate(${PADDING}, ${PADDING})`)

  // Add the Y-Axis and the horizontal gridlines
  d3main
    .append('svg:g')
    .classed(getClass('yAxis'), true)
    .attr('transform', `translate(${Y_AXIS_PADDING - Y_AXIS_TICK}, 0)`)
    .call(d3yAxis)
    .call((d3selection: any) => {
      d3selection
        .selectAll('.tick')
        .append('svg:line')
        .classed(getClass('Gridline'), true)
        .attr('x1', 5)
        .attr('x2', iPlotWidth + Y_AXIS_TICK)
    })

  // Add the X-Axis group
  const d3xAxisGroup = d3main
    .append('svg:g')
    .classed(getClass('xAxis'), true)
    .attr('transform', `translate(${Y_AXIS_PADDING},${iPlotHeight})`)

  // Add the 0-Line to the X-Axis
  d3xAxisGroup.append('svg:line').attr('x2', iPlotWidth)

  const d3ticks = d3xAxisGroup.append('svg:g').classed(getClass('Ticks'), true)

  // Add X-Axis first tick mark
  d3ticks
    .append('svg:line')
    .classed(getClass(['Tick', 'Outer']), true)
    .attr('y2', Y_AXIS_TICK)

  // Add X-Axis inner tick marks
  d3ticks
    .selectAll(`.${getClass('Inner')}`)
    .data(aDimensions[0].values.slice(1))
    .enter()
    .append('svg:line')
    .classed(getClass(['Tick', 'Inner']), true)
    .attr('x1', (_val: any, iValueIndex: number) => aDimensions[0].xScale(iValueIndex + 1))
    .attr('x2', (_val: any, iValueIndex: number) => aDimensions[0].xScale(iValueIndex + 1))
    .attr('y2', function (_val: any, iTickIndex: number) {
      let iDimensions = 0
      aDimensions.slice(1).forEach((mDimension: any) => {
        const iStep = aDimensions[0].values.length / mDimension.values.length
        if ((iTickIndex + 1) % iStep === 0) {
          iDimensions += 1
        }
      })
      if (iDimensions) {
        d3.select(this).classed(getClass('Divider'), true)
        return X_AXIS_DIMENSION_PADDING * (iDimensions + 0.5)
      }
      return Y_AXIS_TICK
    })

  // Add X-Axis last tick mark
  d3ticks
    .append('svg:line')
    .classed(getClass(['Tick', 'Outer']), true)
    .attr('x1', iPlotWidth)
    .attr('x2', iPlotWidth)
    .attr('y2', Y_AXIS_TICK)

  // Add the X-Axis Labels
  aDimensions.forEach((mDimension: any, iDimensionIndex: number) => {
    const d3labels = d3xAxisGroup.append('svg:g')

    // Add X-Axis Label groups with click handler
    const d3label = d3labels
      .selectAll(`.${getClass('Label')}`)
      .data(mDimension.values)
      .enter()
      .append('svg:g')
      .classed(getClass('Label'), true)
      .attr('transform', (_: any, iValueIndex: number) => {
        const nTranslateX = mDimension.xScale(iValueIndex)
        const nTranslateY = X_AXIS_DIMENSION_PADDING * iDimensionIndex
        return `translate(${nTranslateX}, ${nTranslateY})`
      })
      .on('click', (_: any, iRectIndex: number) => {
        const iStep = newResponse.data.length / mDimension.values.length
        newResponse.data.slice(iRectIndex * iStep, (iRectIndex + 1) * iStep).forEach((mSelectedData: any) => {
          mSelectedData.selected = true
        })
        updateSelection(iRectIndex * iStep)
      })

    // Add X-Axis Label Tooltip
    d3label.append('svg:title').text((sValue: string) => sValue)

    // Add X-Axis Label background rect
    d3label
      .append('svg:rect')
      .classed(getClass('LabelBackground'), true)
      .attr('x', mDimension.xScale.rangeBand() - 2 >= 1 ? 1 : 0)
      .attr('y', 1)
      .attr('width', mDimension.xScale.rangeBand() - (mDimension.xScale.rangeBand() - 2 >= 1 ? 2 : 0))
      .attr('height', X_AXIS_DIMENSION_PADDING - 1)

    // Add X-Axis Label text
    d3label
      .append('svg:text')
      .text((sValue: string) => sValue)
      .classed(getClass('LabelTextHidden'), function () {
        return (this as any).getBBox().width > mDimension.xScale.rangeBand() - 2
      })
      .attr('x', mDimension.xScale.rangeBand() / 2)
      .attr('y', X_AXIS_DIMENSION_PADDING * 0.75)
  })

  // Add the Plot Area
  const d3plot = d3main.append('svg:g').attr('transform', `translate(${Y_AXIS_PADDING}, 0)`)

  let currentBoxWidth: number

  // Add the Boxes
  d3plot
    .selectAll(`.${getClass('Boxplot')}`)
    .data(newResponse.data)
    .enter()
    .append('svg:g')
    .classed(getClass('Boxplot'), true)
    .classed(getClass('Selected'), (mData: any) => mData.selected)
    .each(function (mData: any, iIndex: number) {
      const d3this = d3.select(this)

      // replace the "NoValue" values with proper numeric values
      const mDataValues = mData.values.map((value: any) => {
        if (value === 'NoValue') {
          // always display "NoValue" values at the min bound of the scale
          return d3yScale.domain()[0]
        }
        return value
      })

      // Calculate position and width of the boxes
      let iBoxBegin = d3xValueScale(iIndex)
      currentBoxWidth = d3xValueScale.rangeBand()
      if (currentBoxWidth > BOX_MAX_WIDTH) {
        iBoxBegin += (currentBoxWidth - BOX_MAX_WIDTH) / 2
        currentBoxWidth = BOX_MAX_WIDTH
      }
      const iHLineBegin = iBoxBegin + currentBoxWidth / 4
      const iHLineEnd = iHLineBegin + currentBoxWidth / 2
      const iXCenter = d3xValueScale(iIndex) + d3xValueScale.rangeBand() / 2

      // Calculate height of boxes
      const nWhiskerHeight = d3yScale(mDataValues[0]) - d3yScale(mDataValues[4])
      const nBoxHeight = d3yScale(mDataValues[1]) - d3yScale(mDataValues[3])

      // Only draw whiskers if the minimun is different from the maximum
      if (nWhiskerHeight > 0) {
        // Add box top vertical line
        d3this
          .append('svg:line')
          .classed(getClass('Whisker'), true)
          .attr('x1', iXCenter)
          .attr('x2', iXCenter)
          .attr('y1', d3yScale(mDataValues[0]))
          .attr('y2', d3yScale(mDataValues[1]))

        // Add box bottom vertical line
        d3this
          .append('svg:line')
          .classed(getClass('Whisker'), true)
          .attr('x1', iXCenter)
          .attr('x2', iXCenter)
          .attr('y1', d3yScale(mDataValues[3]))
          .attr('y2', d3yScale(mDataValues[4]))

        // Add box top horizontal line
        d3this
          .append('svg:line')
          .classed(getClass('Whisker'), true)
          .attr('x1', iHLineBegin)
          .attr('x2', iHLineEnd)
          .attr('y1', d3yScale(mDataValues[0]))
          .attr('y2', d3yScale(mDataValues[0]))

        // Add box bottom horizontal line
        d3this
          .append('svg:line')
          .classed(getClass('Whisker'), true)
          .attr('x1', iHLineBegin)
          .attr('x2', iHLineEnd)
          .attr('y1', d3yScale(mDataValues[4]))
          .attr('y2', d3yScale(mDataValues[4]))
      }

      // Add actual box
      d3this
        .append('svg:rect')
        .classed(getClass('Box'), true)
        .attr('x', iBoxBegin)
        .attr('y', d3yScale(mDataValues[3]) - (nBoxHeight === 0 ? 1 : 0))
        .attr('width', currentBoxWidth)
        .attr('height', nBoxHeight || 2)
        .attr('rx', 2)
        .attr('ry', 2)

      // Add box median horizontal line if there is a full box
      if (nBoxHeight > 0) {
        d3this
          .append('svg:line')
          .classed(getClass('Median'), true)
          .attr('x1', iBoxBegin)
          .attr('x2', iBoxBegin + currentBoxWidth)
          .attr('y1', d3yScale(mDataValues[2]))
          .attr('y2', d3yScale(mDataValues[2]))
      }

      // Add box overlay with click and mouse handlers
      d3this
        .append('svg:rect')
        .classed(getClass('Overlay'), true)
        .attr('x', iBoxBegin)
        .attr('y', d3yScale(mDataValues[4]) - (nWhiskerHeight === 0 ? 2 : 0))
        .attr('width', currentBoxWidth)
        .attr('height', nWhiskerHeight || 4)
        .on('click', (mClickedData: any) => {
          mClickedData.selected = !mClickedData.selected
          let iOpenerIndex
          if (mClickedData.selected) {
            iOpenerIndex = iIndex
          }
          updateSelection(iOpenerIndex)
          tooltipButtonPosition.value = positionTooltipButton(iOpenerIndex)
          openTooltipButton()
        })
        .on('mouseenter', () => {
          if (!showTooltipButton.value) {
            positionTooltip()
            updateTooltip(iIndex)
            openTooltip()
          }
        })
        .on('mousemove', () => {
          positionTooltip()
        })
        .on('mouseleave', () => {
          hideTooltip()
        })
    })
}

const getClass = (vClass?: string | string[]) => {
  const sBaseClass = 'appMriPaBoxplotChart'
  if (!vClass) {
    return sBaseClass
  }
  if (!Array.isArray(vClass)) {
    vClass = [vClass]
  }
  return vClass.map((sClass: string) => sBaseClass + sClass).join(' ')
}

const hideTooltipButton = () => {
  showTooltipButton.value = false
}

const hideTooltip = () => {
  showTooltip.value = false
}

const openTooltip = () => {
  if (tooltipCategories.value.length) {
    showTooltip.value = true
  }
}

const openTooltipButton = () => {
  if (tooltipCategories.value.length) {
    showTooltipButton.value = true
  }
}

const generateBoxplotInfo = (data: any) => {
  if (!data) {
    tooltipCategories.value = []
    tooltipMeasures.value = []
    tooltipPatientCount.value = 0
    return
  }
  const indexIconMap = ['X1']

  const categories = getActiveAxes.value
    .filter(({ props }: any) => props.axis === 'X' && props.attributeId)
    .map((axis: any) => ({
      icon: Constants.AxisIcons[indexIconMap[axis.props.seq - 1]],
      value: data[axis.props.attributeId],
    }))

  const measures = data.values.map((val: any, idx: number) => ({
    icon: Constants.AxisIcons.Y,
    name: getText(VALUE_KEY_LIST[idx]),
    value: val,
  }))

  const pcount = data.NUM_ENTRIES

  tooltipCategories.value = categories
  tooltipMeasures.value = measures
  tooltipPatientCount.value = pcount
}

const updateTooltip = (iX: number) => {
  const hoveredData = chartData.value.data[iX]
  generateBoxplotInfo(hoveredData)
}

const positionTooltip = () => {
  const obj: any = {}

  const iY = (d3.event as any).clientY - boxPlotchart.value.parentElement.getBoundingClientRect().top
  const bTop = iY < boxPlotchart.value.parentElement.offsetHeight / 2
  if (bTop) {
    obj.top = `${(d3.event as any).clientY + 10}px`
  } else {
    obj.bottom = `${window.innerHeight - (d3.event as any).clientY + 10}px`
  }

  obj.right = `${window.innerWidth - (d3.event as any).clientX + 10}px`
  tooltipPosition.value = obj
}

const positionTooltipButton = (iOpenerIndex: number) => {
  let element
  let clientRect
  const obj: any = {}
  element =
    iOpenerIndex > -1
      ? document.getElementsByClassName(getClass('Boxplot'))[iOpenerIndex]
      : document.getElementsByClassName(getClass('Selected'))[0]

  const popupheight = 370

  if (element) {
    clientRect = element.getBoundingClientRect()
    obj.top = clientRect.top > popupheight ? clientRect.top - popupheight : 2
    obj.width = 256
    obj.right = window.innerWidth - (clientRect.left + clientRect.width / 2 + obj.width / 2)
    obj.height = clientRect.top > popupheight ? popupheight : clientRect.top
  }

  return obj
}

const getSelectedData = () => {
  const aSelectedData: any[] = []
  selection.value.forEach((mDatapoint: any) => {
    chartData.value.categories.forEach((mCategory: any) => {
      aSelectedData.push({
        id: mCategory.id,
        value: mDatapoint[mCategory.id],
      })
    })
  })
  return aSelectedData
}

const updateSelection = (iOpenerIndex?: number) => {
  hideTooltip()
  showTooltip.value = false
  selection.value = chartData.value.data.filter((mFilterData: any, iFilterIndex: number) => {
    if (typeof iOpenerIndex === 'undefined' && mFilterData.selected) {
      iOpenerIndex = iFilterIndex
    }
    return mFilterData.selected
  })

  const bHAsSelection = selection.value.length > 0
  d3.select(boxPlotchart.value)
    .select('svg')
    .classed(getClass('Selection'), bHAsSelection)
    .selectAll(`.${getClass('Boxplot')}`)
    .classed(getClass('Selected'), (mData: any) => mData.selected)

  updateTooltip(iOpenerIndex!)

  if (!bHAsSelection) {
    hideTooltipButton()
    openTooltip()
  }
}

const drilldown = () => {
  emit('drilldown')
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

const getLowerAxisProperties = () => {
  const xAxisProperties = [
    {
      type: 'x',
      order: 0,
      layoutLeft: 0,
      layoutTop: 0,
      layoutBottom: 60,
      icon: '',
      iconFamily: 'app-MRI-icons',
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

const getUpperAxisProperties = () => {
  const upperAxisProperties = [
    {
      chart: 'boxplot',
      type: 'y',
      order: 0,
      icon: '',
      iconFamily: 'app-MRI-icons',
      isCategory: false,
      isMeasure: true,
      active: true,
      layoutLeft: 0,
      layoutTop: 100,
      layoutBottom: 0,
      axisPropertyTooltip: selectedAxis.value.y.axisPropertyTooltip,
      axisPropertyText: selectedAxis.value.y.axisPropertyText,
      axisAttrText: selectedAxis.value.y.axisAttrText,
    },
  ]
  return upperAxisProperties
}

// Watchers
watch(
  () => props.yAxis,
  val => {
    if (val) {
      fireCompareRequest()
    }
  }
)

watch(
  () => props.xAxes,
  val => {
    if (val) {
      fireCompareRequest()
    }
  }
)

// Lifecycle hooks
onMounted(() => {
  setUpSelectedAxis()
  emit('upperAxisMenu', getUpperAxisProperties())
  emit('lowerAxisMenu', getLowerAxisProperties())
  nextTick(() => {
    window.addEventListener('resize', renderChart)
  })
  fireCompareRequest()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', renderChart)
})
</script>
