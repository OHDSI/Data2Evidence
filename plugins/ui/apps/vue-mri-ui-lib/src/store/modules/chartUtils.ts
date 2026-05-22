// Utilty module for chart functions that rely on store getters
// tslint:disable:no-shadowed-variable
import Constants from '@/utils/Constants'
import DateUtils from '@/utils/DateUtils'
import Sorter from '@/utils/Sorter'

const state = {}

// Helper function to truncate text at word boundary
// Strictly honours maxLength: the ellipsis budget (3 chars) is subtracted
// before searching for the last word boundary, so the result is always ≤ maxLength.
const truncateAtWordBoundary = (text: string, maxLength: number): string => {
  if (!text) return text
  if (text.length <= maxLength) {
    return text
  }

  const ellipsis = '...'
  const budget = maxLength - ellipsis.length // chars available before the ellipsis

  if (budget <= 0) {
    // maxLength is too small to fit even one char + ellipsis; just truncate hard
    return text.slice(0, maxLength)
  }

  // Find the last space within the budget
  const truncated = text.slice(0, budget)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  if (lastSpaceIndex > 0) {
    return text.slice(0, lastSpaceIndex) + ellipsis
  }
  return truncated + ellipsis
}

// Helper function to build tickvals (full values) and ticktext (truncated/full) for Plotly x-axis.
// Only operates on single-axis charts — Plotly multicategory tick overrides are fragile and skipped.
// Returns null for multi-axis charts so the component falls back to Plotly's native rendering.
const buildTickLabels = (
  xAxes: { id: string; axis: number; name: string }[],
  data: Record<string, string | number>[]
): { tickvals: string[]; ticktext: string[]; ticktextFull: string[] } | null => {
  if (!xAxes || xAxes.length === 0 || !data || data.length === 0) return null

  // Skip manual tick overrides for multicategory (multi-axis) charts
  if (xAxes.length > 1) return null

  const seen = new Set<string>()
  const tickvals: string[] = []
  const ticktext: string[] = []
  const ticktextFull: string[] = []
  data.forEach(row => {
    const val = String(row[xAxes[0].id] ?? '')
    if (!seen.has(val)) {
      seen.add(val)
      tickvals.push(val)
      ticktextFull.push(val)
      ticktext.push(truncateAtWordBoundary(val, Constants.XAxisLabelMaxLength))
    }
  })
  return { tickvals, ticktext, ticktextFull }
}

// Helper function to wrap text by inserting <br> at word boundaries when exceeding max width
const wrapText = (text: string | number, maxWidth: number): string => {
  const str = String(text ?? '')
  if (str.length <= maxWidth) return str
  const words = str.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word
    if (testLine.length > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines.join('<br>')
}

const getters = {
  /*
    Adds bar chart traces expected by Plotly based on chartData
  */
  dataToTraces:
    (state, getters) =>
    (chartData, selection = [], totalSelected = 0) => {
      // create on a shallow copy
      const result = { ...chartData, data: [...chartData.data] }

      const xAxes: { id: string; axis: number; name: string }[] = result.categories.filter(
        category => category.axis === Constants.AxisId.X
      )
      // Flag to toggle the bar chart category type
      result.axisType = xAxes.length > 1 ? 'multicategory' : 'category'
      // Get the unique y-axis attribute id if any
      const yAxis = result.categories.filter(category => category.axis === Constants.AxisId.Y)

      const categoryArray: { name: string | number; data: Record<string, string | number>[] }[] = []
      if (yAxis.length !== 0) {
        // Dictionary-based data categorization based on the unique y-axis attribute
        const yAttrKey = yAxis[0].id
        const dataDict = {}
        result.data.forEach(data => {
          const yAttrVal = data[yAttrKey]
          if (yAttrVal in dataDict) {
            categoryArray[dataDict[yAttrVal]].data.push(data)
          } else {
            dataDict[yAttrVal] = categoryArray.length
            categoryArray.push({
              name: yAttrVal,
              data: [data],
            })
          }
        })
      } else {
        // No data split, singleton category
        categoryArray.push({
          name: '',
          data: result.data,
        })
      }

      const measureId = result.measures[0].id
      const toolTipSelected =
        wrapText(result.measures[0].name, 62) +
        ': <b>%{y:,}</b><br><br><b>' +
        (totalSelected > 1 ? totalSelected + ' values selected' : '') +
        '</b><extra></extra>'
      // Convert data belonging to each attribute category into traces
      // Reversed since the last trace will appear at the top
      result.traces = categoryArray.reverse().map((category, index) => {
        let xData = []
        let customdataArray = []
        // Custom tooltip labelling
        let hoverTemplate = ''
        if (xAxes.length === 1) {
          xData = category.data.map(data => String(data[xAxes[0].id]))
          customdataArray = category.data.map(dataPoint => ({
            x: xAxes,
            y: yAxis,
            values: [String(dataPoint[xAxes[0].id])],
            fullLabels: [wrapText(dataPoint[xAxes[0].id], 62)],
          }))
          hoverTemplate += '%{customdata.x[0].name}: %{customdata.fullLabels[0]}<br>'
        } else {
          xData = xAxes.map(xAxis =>
            category.data.map(data => truncateAtWordBoundary(String(data[xAxis.id]), Constants.XAxisLabelMaxLength))
          )
          // Build customdata array with full labels for each data point
          customdataArray = category.data.map(dataPoint => {
            const values = xAxes.map(xAxis => String(dataPoint[xAxis.id]))
            const fullLabels = xAxes.map(xAxis => wrapText(dataPoint[xAxis.id], 62))
            return { x: xAxes, y: yAxis, values, fullLabels }
          })
          for (let i = 0; i < xAxes.length; i++) {
            hoverTemplate += '%{customdata.x[' + i + '].name}: %{customdata.fullLabels[' + i + ']}<br>'
          }
        }
        if (category.name !== '') {
          hoverTemplate += '%{customdata.y[0].name}: ' + wrapText(category.name, 62) + '<br>'
        }
        hoverTemplate += toolTipSelected

        const fullName = String(category.name)
        const truncatedName = truncateAtWordBoundary(fullName, 20)

        return {
          x: xData,
          y: category.data.map(data => data[measureId]),
          type: 'bar',
          hovertemplate: hoverTemplate,
          customdata: customdataArray,
          selectedpoints: selection ? selection[index] : [],
          name: truncatedName,
          meta: { fullName },
          marker: {
            line: {
              color: '#4a4949',
              width: 0.7,
            },
          },
        }
      })

      // Attach tick label mappings so the Vue component can apply truncated display labels
      // while keeping full (untruncated) values in trace.x for selection events
      const tickLabels = buildTickLabels(xAxes, result.data)
      if (tickLabels) {
        result.tickvals = tickLabels.tickvals
        result.ticktext = tickLabels.ticktext
        result.ticktextFull = tickLabels.ticktextFull
      } else {
        result.tickvals = undefined
        result.ticktext = undefined
        result.ticktextFull = undefined
      }

      // TODO: coloring based on x-axis categories for non-stacked bar chart

      return result
    },
  processResponse:
    (state, getters) =>
    (resp: any, sortOrder = '') => {
      if (resp) {
        const duplicatedResp = { ...resp }
        const sortableCategories = Sorter.buildSortableCategories(duplicatedResp)
        const sortedOriginalData = Sorter.sortCategory(
          sortableCategories,
          duplicatedResp.data,
          'MRI_PA_CHART_SORT_ASCENDING',
          0
        )
        duplicatedResp.data = sortedOriginalData

        duplicatedResp.measures.forEach(measure => {
          const sParent = getters.getMriFrontendConfig.getAttributeByPath(measure.id).sParentPath
          let filterCardName = ''
          if (sParent === 'patient') {
            filterCardName = getters.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
          } else {
            filterCardName = getters.getMriFrontendConfig.getFilterCardByPath(sParent).getName()
          }

          // Only add prefix if it's not already there to prevent duplicate prefixes
          const attributeName = getters.getMriFrontendConfig.getAttributeByPath(measure.id).getName()

          if (!measure.name || !measure.name.startsWith(filterCardName + ' - ')) {
            measure.name = `${filterCardName} - ${attributeName}`
          }
        })

        let bHasDummyCategory = false
        duplicatedResp.categories = duplicatedResp.categories.map(mCategory => {
          if (mCategory.id === 'dummy_category') {
            mCategory.name = getters.getText('MRI_PA_DUMMY_CATEGORY')
            bHasDummyCategory = true
          } else {
            const oAttributeConfig = getters.getMriFrontendConfig.getAttributeByPath(mCategory.id)
            if (
              oAttributeConfig &&
              (oAttributeConfig.getType() === Constants.CDMAttrType.Date ||
                oAttributeConfig.getType() === Constants.CDMAttrType.Datetime)
            ) {
              duplicatedResp.data.forEach(mDatum => {
                const dDate = DateUtils.parseISODate(mDatum[mCategory.id])
                if (dDate && dDate.toString() !== 'Invalid Date') {
                  mDatum[mCategory.id] =
                    oAttributeConfig.getType() === Constants.CDMAttrType.Date
                      ? DateUtils.displayDateFormat(dDate)
                      : DateUtils.displayDateTimeFormat(dDate)
                }
              })
            }
          }
          return mCategory
        })

        if (bHasDummyCategory) {
          duplicatedResp.data.forEach(mData => {
            mData.dummy_category = getters.getText('MRI_PA_CURRENT_COHORT')
          })
        }
        const sortProperty = getters.sortProperty
        if (sortOrder || (sortProperty && sortProperty.props && sortProperty.props.value)) {
          const sortType = sortProperty.props.value
          const sorted = getters.sortData(duplicatedResp, sortType)
          sorted.data = getters.translate(sorted.data)
          return sorted
        }
        duplicatedResp.data = getters.translate(duplicatedResp.data)
        return duplicatedResp
      }
      return resp
    },
  sortData: (state, getters) => (originalData: any, sortType: string) => {
    const sortedData = JSON.parse(JSON.stringify(originalData))
    let internalData = sortedData.data

    if (!sortType || sortType === 'MRI_PA_CHART_SORT_DEFAULT' || internalData.length <= 0) {
      return sortedData
    }

    const sortableCategories = Sorter.buildSortableCategories(sortedData)

    if (sortType === 'MRI_PA_CHART_SORT_REVERSE') {
      sortedData.data = Sorter.sortCategory(sortableCategories, internalData, 'MRI_PA_CHART_SORT_DESCENDING', 0)
      return sortedData
    }

    const measure = sortedData.measures[0].id
    internalData = getters.sortDataByCategory(sortableCategories, measure, internalData, sortType, 0)

    sortedData.data = internalData

    return sortedData
  },
  sortDataByCategory:
    (state, getters) =>
    (constantCategories: any[], measure: number, data: any[], sortType: string, categoryIndex: number): any[] => {
      let categoryData: any = {}
      const summarizedData = []

      if (constantCategories[categoryIndex].axis) {
        return Sorter.sortCategory(constantCategories, data, 'MRI_PA_CHART_SORT_ASCENDING', categoryIndex)
      }

      const sortFunction =
        sortType === 'MRI_PA_CHART_SORT_ASCENDING'
          ? function sort(a, b) {
              return a.value - b.value
            }
          : function sort(a, b) {
              return b.value - a.value
            }

      categoryData[constantCategories[categoryIndex].id] = data[0][constantCategories[categoryIndex].id]
      categoryData[measure] = 0
      let previousIndex = 0

      // Colate Measure
      for (let i = 0; i < data.length; i += 1) {
        if (categoryData[constantCategories[categoryIndex].id] === data[i][constantCategories[categoryIndex].id]) {
          categoryData[measure] += data[i][measure]
        } else {
          categoryData.rangeBegin = previousIndex
          categoryData.rangeEnd = i - 1
          categoryData.value = categoryData[measure]
          summarizedData.push(categoryData)

          categoryData = {}
          categoryData[constantCategories[categoryIndex].id] = data[i][constantCategories[categoryIndex].id]
          categoryData[measure] = data[i][measure]
          previousIndex = i
        }
      }

      categoryData.rangeBegin = previousIndex
      categoryData.rangeEnd = data.length - 1
      categoryData.value = categoryData[measure]
      summarizedData.push(categoryData)

      summarizedData.sort(sortFunction)

      const sortedData = []
      let physicalData = []

      for (let i = 0; i < summarizedData.length; i += 1) {
        physicalData = []
        for (let ii = summarizedData[i].rangeBegin; ii <= summarizedData[i].rangeEnd; ii += 1) {
          physicalData.push(data[ii])
        }

        if (categoryIndex < constantCategories.length - 1) {
          physicalData = getters.sortDataByCategory(
            constantCategories,
            measure,
            physicalData,
            sortType,
            categoryIndex + 1
          )
        }

        for (let ii = 0; ii < physicalData.length; ii += 1) {
          sortedData.push(physicalData[ii])
        }
      }

      return sortedData
    },
  sortProperty: (state, getters) => getters.getChartProperty(Constants.MRIChartProperties.Sort),
  translate: (state, getters) => (obj: any) => {
    Object.keys(obj).forEach(k => {
      switch (typeof obj[k]) {
        case 'object':
          if (obj[k] instanceof Array) {
            obj[k] = getters.translateText(obj[k], k)
          } else {
            getters.translate(obj[k])
          }
          break
        case 'string':
          obj[k] = getters.translateText(obj[k], k)
          break
        default:
          break
      }
    })
    return obj
  },
  translateText: (state, getters) => (str: string, key: string) => {
    const attribute = getters.getMriFrontendConfig.getAttributeByPath(key)
    if (str === 'NoValue') {
      if (getters.getMriFrontendConfig.isNoValueTextCustomized()) {
        return getters.getText('MRI_PA_NO_VALUE_CUSTOM', attribute.oInternalConfigAttribute.name)
      }
      return getters.getText('MRI_PA_NO_VALUE')
    }
    return str
  },
}

const actions = {}

const mutations = {}

export default {
  state,
  getters,
  actions,
  mutations,
}
