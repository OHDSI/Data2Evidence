// Utilty module for chart functions that rely on store getters
// tslint:disable:no-shadowed-variable
import Constants from '@/utils/Constants'
import DateUtils from '@/utils/DateUtils'
import Sorter from '@/utils/Sorter'

const state = {}

const getters = {
  /*
    Adds bar chart traces expected by Plotly based on chartData
  */
  dataToTraces:
    (state, getters) =>
    (chartData, selection = [], totalSelected = 0) => {
      const xAxes = chartData.categories.filter(category => category.axis === Constants.AxisId.X)
      // Flag to toggle the bar chart category type
      chartData.axisType = xAxes.length > 1 ? 'multicategory' : 'category'
      // Get the unique y-axis attribute id if any
      const yAxis = chartData.categories.filter(category => category.axis === Constants.AxisId.Y)

      const categoryArray = []
      if (yAxis.length !== 0) {
        // Dictionary-based data categorization based on the unique y-axis attribute
        const yAttrKey = yAxis[0].id
        const dataDict = {}
        chartData.data.forEach(data => {
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
          data: chartData.data,
        })
      }

      const measureId = chartData.measures[0].id
      const toolTipSelected =
        chartData.measures[0].name +
        ': <b>%{y}</b><br><br><b>' +
        (totalSelected > 1 ? totalSelected + ' values selected' : '') +
        '</b><extra></extra>'
      // Convert data belonging to each attribute category into traces
      // Reversed since the last trace will appear at the top
      chartData.traces = categoryArray.reverse().map((category, index) => {
        let xData = []
        // Custom hover labelling
        let hoverTemplate = ''
        if (xAxes.length === 1) {
          xData = category.data.map(data => data[xAxes[0].id])
          hoverTemplate += '%{data.customdata.x[0].name}: %{x}<br>'
        } else {
          xData = xAxes.map(xAxis => category.data.map(data => data[xAxis.id]))
          for (let i = 0; i < xAxes.length; i++) {
            hoverTemplate += '%{data.customdata.x[' + i + '].name}: %{x[' + i + ']}<br>'
          }
        }
        if (category.name !== '') {
          hoverTemplate += '%{data.customdata.y[0].name}: ' + category.name + '<br>'
        }
        hoverTemplate += toolTipSelected

        return {
          x: xData,
          y: category.data.map(data => data[measureId]),
          type: 'bar',
          hovertemplate: hoverTemplate,
          customdata: {
            x: xAxes,
            y: yAxis,
          },
          selectedpoints: selection ? selection[index] : [],
          name: category.name,
        }
      })
      return chartData
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

          measure.name = `${filterCardName} - ${getters.getMriFrontendConfig.getAttributeByPath(measure.id).getName()}`
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
