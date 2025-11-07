<template>
  <div class="boxplot-container">
    <template v-if="errorMessage">
      <chartErrorMessage :errorMessage="errorMessage"></chartErrorMessage>
    </template>
    <template v-else>
      <div class="boxplot-chart" id="boxplot-chart" ref="chart"></div>
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
      <chartPopoverDrill
        v-if="showTooltipButton"
        :position="tooltipButtonPosition"
        @close="hideTooltipButton"
        @drilldown="drilldown"
      >
        <template v-slot:body>
          <boxplotInfo
            :tooltipCategories="tooltipCategories"
            :tooltipMeasures="tooltipMeasures"
            :tooltipPatientCount="tooltipPatientCount"
            :selection="selection"
          />
        </template>
      </chartPopoverDrill>
    </template>
  </div>
</template>

<script lang="ts">
import d3 from 'd3'
import { mapActions, mapGetters } from 'vuex'
import Constants from '../utils/Constants'
import processCSV from '../utils/ProcessCSV'
import boxplotInfo from './BoxplotInfo.vue'
import chartErrorMessage from './ChartErrorMessage.vue'
import ChartPopover from './ChartPopover.vue'
import chartPopoverDrill from './ChartPopoverDrill.vue'

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

export default {
  name: 'boxplotChart',
  props: ['busyEv'],
  chartData: {},
  data() {
    return {
      errorMessage: '',
      selection: [],
      showTooltip: false,
      showTooltipButton: false,
      tooltipPosition: {},
      tooltipCategories: [],
      tooltipMeasures: [],
      tooltipPatientCount: 0,
      boxplotChartStyle: {},
    }
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('resize', this.renderChart)
    })
    this.setupAxes()
    this.setFireRequest()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.renderChart)
  },
  computed: {
    ...mapGetters([
      'getSplitterWidth',
      'getChartSize',
      'getText',
      'getCsvFireDownload',
      'getFireRequest',
      'getActiveAxes',
      'getBookmarksData',
      'processResponse',
    ]),
  },
  watch: {
    getSplitterWidth() {
      this.renderChart()
    },
    getChartSize() {
      const pdfSize = this.getChartSize
      const boxplotChartStyle: any = {}
      if (pdfSize.width) {
        boxplotChartStyle.width = pdfSize.width // `${pdfSize.width}px`;
      }

      if (pdfSize.height) {
        boxplotChartStyle.height = pdfSize.height // `${pdfSize.height}px`;
      }

      this.boxplotChartStyle = boxplotChartStyle

      this.$nextTick(() => {
        this.renderChart(true)
        if (pdfSize.width || pdfSize.height) {
          this.setPdfChartReady(true)
        } else {
          this.setPdfChartReady(false)
        }
      })
    },
    getFireRequest() {
      this.reset()

      const callback = chartData => {
        this.chartData = this.processResponse(chartData)
        this.setCurrentPatientCount({
          currentPatientCount: this.chartData.totalPatientCount,
        })
        this.renderChart()
        this.$emit('busyEv', false)

        if (this.chartData.hasOwnProperty('noDataReason')) {
          this.setCurrentPatientCount({
            currentPatientCount: '--',
          })
        }
      }

      this.$emit('busyEv', false)
      const bookmark = this.getBookmarksData
      if (Object.keys(bookmark).length !== 0 && bookmark) {
        this.fireQuery({
          url: '/analytics-svc/api/services/population/json/boxplot',
          params: { mriquery: JSON.stringify(bookmark) },
        })
          .then(callback)
          .catch(({ message, response }) => {
            if (message !== 'cancel') {
              this.$emit('busyEv', false)
            }

            if (response) {
              let noDataReason = this.getText('MRI_PA_CHART_NO_DATA_DEFAULT_MESSAGE')

              // For all handled errors from backend
              if (response.data.errorType === 'MRILoggedError') {
                noDataReason = this.getText('MRI_DB_LOGGED_MESSAGE', response.data.logId)
              }

              this.errorMessage = noDataReason
            }

            this.setCurrentPatientCount({
              currentPatientCount: '--',
            })
          })
        this.$emit('busyEv', true)
      }
    },
    getCsvFireDownload() {
      this.downloadCSV({ ...this.getBookmarksData })
        .then(processCSV)
        .catch(err => {
          // do nothing
        })
        .finally(() => {
          this.completeDownloadCSV()
        })
    },
  },
  methods: {
    ...mapActions([
      'setAxisValue',
      'fireQuery',
      'disableAllAxesandProperties',
      'setChartSelection',
      'setPdfChartReady',
      'downloadCSV',
      'setCurrentPatientCount',
      'setFireRequest',
      'completeDownloadCSV',
    ]),
    reset() {
      this.errorMessage = ''
      this.selection = []
      this.hideTooltipButton()
      this.hideTooltip()
    },
    setupAxes() {
      this.disableAllAxesandProperties()

      this.setAxisValue({
        id: Constants.MRIChartDimensions.Y,
        props: {
          layoutLeft: '0px',
          layoutTop: '31px',
          layoutBottom: '',
          icon: '',
          iconFamily: 'app-MRI-icons',
          isCategory: false,
          isMeasure: true,
          active: true,
        },
      })
      const iLevelHeight = 41
      for (let i = 0; i <= Constants.MRIChartDimensions.X3; i += 1) {
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
    retrieveText(textKey) {
      return this.getText(textKey)
    },
    getClass(vClass) {
      const sBaseClass = 'appMriPaBoxplotChart'
      if (!vClass) {
        return sBaseClass
      }
      if (!Array.isArray(vClass)) {
        // tslint:disable-next-line:no-parameter-reassignment
        vClass = [vClass]
      }
      return vClass.map(sClass => sBaseClass + sClass).join(' ')
    },
    renderChart() {
      const newResponse = this.chartData

      d3.select(this.$refs.chart).select('svg').remove()
      if (
        !newResponse ||
        !newResponse.data ||
        !newResponse.categories ||
        !(Array.isArray(newResponse.data) && newResponse.data.length) ||
        !(Array.isArray(newResponse.categories) && newResponse.categories.length) ||
        !this.$el
      ) {
        if (newResponse && newResponse.noDataReason) {
          this.errorMessage = newResponse.noDataReason
        }
        return
      }
      this.errorMessage = ''

      const aDimensions = newResponse.categories.concat().reverse()
      // tslint:disable-next-line:no-this-assignment
      const that = this
      let iHeight = this.$el.offsetHeight
      let iWidth = this.$el.offsetWidth

      if (this.boxplotChartStyle && this.boxplotChartStyle.width) {
        iWidth = this.boxplotChartStyle.width
      }

      if (this.boxplotChartStyle && this.boxplotChartStyle.height) {
        iHeight = this.boxplotChartStyle.height
      }

      const iPlotHeight = iHeight - (X_AXIS_BASE_PADDING + X_AXIS_DIMENSION_PADDING * aDimensions.length) - PADDING * 2
      const iPlotWidth = iWidth - Y_AXIS_PADDING - PADDING * 2

      aDimensions.forEach(mDimension => {
        mDimension.values = []
        newResponse.data.forEach(mData => {
          const sValue = mData[mDimension.id]
          if (!mDimension.values.length || mDimension.values[mDimension.values.length - 1] !== sValue) {
            mDimension.values.push(sValue)
          }
        })
        mDimension.xScale = d3.scale.ordinal().domain(Object.keys(mDimension.values)).rangeBands([0, iPlotWidth])
      })

      // Calculate a range for the Y-Scale
      const iMax = d3.max(newResponse.data, mData => (mData.values[4] === 'NoValue' ? -Infinity : mData.values[4]))
      const iMin = d3.min(newResponse.data, mData => (mData.values[0] === 'NoValue' ? Infinity : mData.values[0]))

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
        .tickFormat(iNumber => iNumber)
        .tickSize(-Y_AXIS_TICK, -Y_AXIS_TICK)

      // Define the X-Scale for the Boxes
      const d3xValueScale = d3.scale
        .ordinal()
        .domain(newResponse.data.map((val, iValueIndex) => iValueIndex))
        .rangeBands([0, iPlotWidth], RANGE_BAND_PADDING, RANGE_BAND_PADDING / 2)

      const d3svg = d3
        .select(this.$refs.chart)
        .append('svg')
        .classed(that.getClass('Selection'), this.selection.length)
        .attr('width', iWidth)
        .attr('height', iHeight)

      // Add the Background
      d3svg
        .append('svg:rect')
        .classed(that.getClass('Background'), true)
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', iWidth)
        .attr('height', iHeight)
        .on('click', () => {
          newResponse.data.forEach(mSelectedData => {
            delete mSelectedData.selected
          })
          that.updateSelection()
        })

      // Add a main group and translate for padding
      const d3main = d3svg.append('svg:g').attr('transform', `translate(${PADDING}, ${PADDING})`)

      // Add the Y-Axis and the horizontal gridlines
      d3main
        .append('svg:g')
        .classed(that.getClass('yAxis'), true)
        .attr('transform', `translate(${Y_AXIS_PADDING - Y_AXIS_TICK}, 0)`)
        .call(d3yAxis)
        .call(d3selection => {
          d3selection
            .selectAll('.tick')
            .append('svg:line')
            .classed(that.getClass('Gridline'), true)
            .attr('x1', 5)
            .attr('x2', iPlotWidth + Y_AXIS_TICK)
        })

      // Add the X-Axis group
      const d3xAxisGroup = d3main
        .append('svg:g')
        .classed(that.getClass('xAxis'), true)
        .attr('transform', `translate(${Y_AXIS_PADDING},${iPlotHeight})`)

      // Add the 0-Line to the X-Axis
      d3xAxisGroup.append('svg:line').attr('x2', iPlotWidth)

      const d3ticks = d3xAxisGroup.append('svg:g').classed(that.getClass('Ticks'), true)

      // Add X-Axis first tick mark
      d3ticks
        .append('svg:line')
        .classed(that.getClass(['Tick', 'Outer']), true)
        .attr('y2', Y_AXIS_TICK)

      // Add X-Axis inner tick marks
      d3ticks
        .selectAll(`.${that.getClass('Inner')}`)
        .data(aDimensions[0].values.slice(1))
        .enter()
        .append('svg:line')
        .classed(that.getClass(['Tick', 'Inner']), true)
        .attr('x1', (val, iValueIndex) => aDimensions[0].xScale(iValueIndex + 1))
        .attr('x2', (val, iValueIndex) => aDimensions[0].xScale(iValueIndex + 1))
        .attr('y2', (val, iTickIndex) => {
          let iDimensions = 0
          aDimensions.slice(1).forEach(mDimension => {
            const iStep = aDimensions[0].values.length / mDimension.values.length
            if ((iTickIndex + 1) % iStep === 0) {
              iDimensions += 1
            }
          })
          if (iDimensions) {
            d3.select(this.$el).classed(that.getClass('Divider'), true)
            return X_AXIS_DIMENSION_PADDING * (iDimensions + 0.5)
          }
          return Y_AXIS_TICK
        })

      // Add X-Axis last tick mark
      d3ticks
        .append('svg:line')
        .classed(that.getClass(['Tick', 'Outer']), true)
        .attr('x1', iPlotWidth)
        .attr('x2', iPlotWidth)
        .attr('y2', Y_AXIS_TICK)

      // Add the X-Axis Labels
      aDimensions.forEach((mDimension, iDimensionIndex) => {
        const d3labels = d3xAxisGroup.append('svg:g')

        // Add X-Axis Label groups with click handler
        const d3label = d3labels
          .selectAll(`.${that.getClass('Label')}`)
          .data(mDimension.values)
          .enter()
          .append('svg:g')
          .classed(that.getClass('Label'), true)
          .attr('transform', (_, iValueIndex) => {
            const nTranslateX = mDimension.xScale(iValueIndex)
            const nTranslateY = X_AXIS_DIMENSION_PADDING * iDimensionIndex
            return `translate(${nTranslateX}, ${nTranslateY})`
          })
          .on('click', (_, iRectIndex) => {
            const iStep = newResponse.data.length / mDimension.values.length
            newResponse.data.slice(iRectIndex * iStep, (iRectIndex + 1) * iStep).forEach(mSelectedData => {
              mSelectedData.selected = true
            })
            that.updateSelection(iRectIndex * iStep)
          })

        // Add X-Axis Label Tooltip
        d3label.append('svg:title').text(sValue => sValue)

        // Add X-Axis Label background rect
        d3label
          .append('svg:rect')
          .classed(that.getClass('LabelBackground'), true)
          .attr('x', mDimension.xScale.rangeBand() - 2 >= 1 ? 1 : 0)
          .attr('y', 1)
          .attr('width', mDimension.xScale.rangeBand() - (mDimension.xScale.rangeBand() - 2 >= 1 ? 2 : 0))
          .attr('height', X_AXIS_DIMENSION_PADDING - 1)

        // Add X-Axis Label text
        d3label
          .append('svg:text')
          .text(sValue => sValue)
          .classed(that.getClass('LabelTextHidden'), function todo() {
            return this.getBBox().width > mDimension.xScale.rangeBand() - 2
          })
          .attr('x', mDimension.xScale.rangeBand() / 2)
          .attr('y', X_AXIS_DIMENSION_PADDING * 0.75)
      })

      // Add the Plot Area
      const d3plot = d3main.append('svg:g').attr('transform', `translate(${Y_AXIS_PADDING}, 0)`)

      let currentBoxWidth

      // Add the Boxes
      d3plot
        .selectAll(`.${that.getClass('Boxplot')}`)
        .data(newResponse.data)
        .enter()
        .append('svg:g')
        .classed(that.getClass('Boxplot'), true)
        .classed(that.getClass('Selected'), mData => mData.selected)
        .each(function createBoxplot(mData, iIndex) {
          const d3this = d3.select(this)

          // replace the "NoValue" values with proper numeric values
          const mDataValues = mData.values.map(value => {
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
              .classed(that.getClass('Whisker'), true)
              .attr('x1', iXCenter)
              .attr('x2', iXCenter)
              .attr('y1', d3yScale(mDataValues[0]))
              .attr('y2', d3yScale(mDataValues[1]))

            // Add box bottom vertical line
            d3this
              .append('svg:line')
              .classed(that.getClass('Whisker'), true)
              .attr('x1', iXCenter)
              .attr('x2', iXCenter)
              .attr('y1', d3yScale(mDataValues[3]))
              .attr('y2', d3yScale(mDataValues[4]))

            // Add box top horizontal line
            d3this
              .append('svg:line')
              .classed(that.getClass('Whisker'), true)
              .attr('x1', iHLineBegin)
              .attr('x2', iHLineEnd)
              .attr('y1', d3yScale(mDataValues[0]))
              .attr('y2', d3yScale(mDataValues[0]))

            // Add box bottom horizontal line
            d3this
              .append('svg:line')
              .classed(that.getClass('Whisker'), true)
              .attr('x1', iHLineBegin)
              .attr('x2', iHLineEnd)
              .attr('y1', d3yScale(mDataValues[4]))
              .attr('y2', d3yScale(mDataValues[4]))
          }

          // Add actual box
          d3this
            .append('svg:rect')
            .classed(that.getClass('Box'), true)
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
              .classed(that.getClass('Median'), true)
              .attr('x1', iBoxBegin)
              .attr('x2', iBoxBegin + currentBoxWidth)
              .attr('y1', d3yScale(mDataValues[2]))
              .attr('y2', d3yScale(mDataValues[2]))
          }

          // Add box overlay with click and mouse handlers
          d3this
            .append('svg:rect')
            .classed(that.getClass('Overlay'), true)
            .attr('x', iBoxBegin)
            .attr('y', d3yScale(mDataValues[4]) - (nWhiskerHeight === 0 ? 2 : 0))
            .attr('width', currentBoxWidth)
            .attr('height', nWhiskerHeight || 4)
            .on('click', mClickedData => {
              mClickedData.selected = !mClickedData.selected
              let iOpenerIndex
              if (mClickedData.selected) {
                iOpenerIndex = iIndex
              }
              that.updateSelection(iOpenerIndex)
              that.tooltipButtonPosition = that.positionTooltipButton(iOpenerIndex)
              that.openTooltipButton()
            })
            .on('mouseenter', () => {
              if (!that.showTooltipButton) {
                that.positionTooltip()
                that.updateTooltip(iIndex)
                that.openTooltip()
              }
            })
            .on('mousemove', () => {
              that.positionTooltip()
              // todo? that._positionTooltip(iXCenter);
            })
            .on('mouseleave', () => {
              that.hideTooltip()
            })
        })
    },
    hideTooltipButton() {
      this.showTooltipButton = false
    },
    hideTooltip() {
      this.showTooltip = false
    },
    openTooltip() {
      if (this.tooltipCategories.length) {
        this.showTooltip = true
      }
    },
    openTooltipButton() {
      if (this.tooltipCategories.length) {
        this.showTooltipButton = true
      }
    },
    generateBoxplotInfo(data) {
      if (!data) {
        this.tooltipCategories = []
        this.tooltipMeasures = []
        this.tooltipPatientCount = 0
        return
      }
      const indexIconMap = ['X1', 'X2', 'X3']

      const categories = this.getActiveAxes
        .filter(({ props }) => props.axis === 'X' && props.attributeId)
        .map(axis => ({
          icon: Constants.AxisIcons[indexIconMap[axis.props.seq - 1]],
          value: data[axis.props.attributeId],
        }))

      const measures = data.values.map((val, idx) => ({
        icon: Constants.AxisIcons.Y,
        name: this.getText(VALUE_KEY_LIST[idx]),
        value: val,
      }))

      const pcount = data.NUM_ENTRIES

      this.tooltipCategories = categories
      this.tooltipMeasures = measures
      this.tooltipPatientCount = pcount
    },
    updateTooltip(iX) {
      const hoveredData = this.chartData.data[iX]
      this.generateBoxplotInfo(hoveredData)
    },
    positionTooltip() {
      const obj: any = {}

      const iY = d3.event.clientY - this.$el.getBoundingClientRect().top
      const bTop = iY < this.$el.offsetHeight / 2
      if (bTop) {
        obj.top = `${d3.event.clientY + 10}px`
      } else {
        obj.bottom = `${window.innerHeight - d3.event.clientY + 10}px`
      }

      obj.right = `${window.innerWidth - d3.event.clientX + 10}px`
      this.tooltipPosition = obj
    },
    positionTooltipButton(iOpenerIndex) {
      let element
      let clientRect
      const obj: any = {}
      element =
        iOpenerIndex > -1
          ? document.getElementsByClassName(this.getClass('Boxplot'))[iOpenerIndex]
          : document.getElementsByClassName(this.getClass('Selected'))[0]

      const popupheight = 370

      if (element) {
        clientRect = element.getBoundingClientRect()
        obj.top = clientRect.top > popupheight ? clientRect.top - popupheight : 2
        obj.width = 256
        obj.right = window.innerWidth - (clientRect.left + clientRect.width / 2 + obj.width / 2)
        obj.height = clientRect.top > popupheight ? popupheight : clientRect.top
      }

      return obj
    },
    getSelectedData() {
      const aSelectedData = []
      this.selection.forEach(mDatapoint => {
        this.chartData.categories.forEach(mCategory => {
          // var dataValue = mDatapoint[mCategory.id];
          // format date categories
          /*
          var oAttributeConfig =
          MriFrontendConfig.getFrontendConfig().getAttributeByPath(mCategory.id);
          if (oAttributeConfig.getType() === hc.mri.pa.ui.lib.CDMAttrType.Date ||
          oAttributeConfig.getType() === hc.mri.pa.ui.lib.CDMAttrType.Datetime) {
              var dDate;
              if (oAttributeConfig.getType() === hc.mri.pa.ui.lib.CDMAttrType.Date) {
                  dDate = Utils.parseDate(mDatapoint[mCategory.id], true);
              } else {
                  dDate = Utils.parseDateTime(mDatapoint[mCategory.id], true);
              }
              if (dDate) {
                  dataValue = Utils.formatISODate(dDate);
              }
          }
          */
          aSelectedData.push({
            id: mCategory.id,
            value: mDatapoint[mCategory.id],
          })
        })
      }, this)
      return aSelectedData
    },
    updateSelection(iOpenerIndex) {
      this.hideTooltip()
      this.showTooltip = false
      this.selection = this.chartData.data.filter((mFilterData, iFilterIndex) => {
        if (typeof iOpenerIndex === 'undefined' && mFilterData.selected) {
          // tslint:disable-next-line:no-parameter-reassignment
          iOpenerIndex = iFilterIndex
        }
        return mFilterData.selected
      })
      this.setChartSelection({ selection: this.getSelectedData() })
      // this.fireSelectionChange();
      const bHAsSelection = this.selection.length > 0
      d3.select(this.$el)
        .select('svg')
        .classed(this.getClass('Selection'), bHAsSelection)
        .selectAll(`.${this.getClass('Boxplot')}`)
        .classed(this.getClass('Selected'), mData => mData.selected)

      this.updateTooltip(iOpenerIndex)

      if (!bHAsSelection) {
        this.hideTooltipButton()
        this.openTooltip()
      }
    },
    drilldown() {
      this.$emit('drilldown')
    },
  },
  components: {
    ChartPopover,
    chartErrorMessage,
    boxplotInfo,
    chartPopoverDrill,
  },
}
</script>
