type StringOrNumber = string | number

const uniqueSeparatorString = '_UNIQUE_SEPARATOR_STRING_'

/** assert
 * @param condition - if false an error will be thrown
 * @param msg - the error message
 */
export function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg)
  }
}

/**
 * Return an independent copy of a pure data object (functions will not be
 * copied).
 *
 * @param json JSON object to be cloned.
 * @returns Indpendent JSON clone of input.
 *
 */
function cloneJson<T>(json: T): T {
  return JSON.parse(JSON.stringify(json))
}

/**
 * Add values to the nested x-axis, so that there are the same sub values in each bin.
 * E.g. When getting this result set
 *
 * Smoker | Y | Y | Y | N |
 * Gender | M | W |   M   |
 * Age    |   15  |   20  |
 *
 * return
 *
 * Smoker | Y | N | Y | N | Y | N | Y | N |
 * Gender |   M   |   W   |   W   |   M   |
 * Age    |       15      |       20      |
 *
 * filling the rest up with zero bars.
 *
 * For binned numerical attributes also add missing values to have a full range of
 * values e.g.
 *
 * with a bin size of 10
 *
 * change
 *
 * | 10 | 20 | 50 |
 *
 * into
 *
 * | 10 | 20 | 30 | 40 | 50 |
 *
 */
export function fillMissingValues(result: IMRIEndpointResultType, boxplot = false) {
  const categories = result.categories
  const measures = result.measures
  const valueRanges: { [key: string]: StringOrNumber[] } = {}

  // If there is no x-axis defined in the request
  if (categories.length >= 1 && categories[0].id === 'dummy_category') {
    return result
  }

  categories.forEach(category => {
    const range = _getFullValueRange(result.data, category, result.postProcessingConfig.NOVALUE)
    valueRanges[category.id] = range
  })

  function hash(dataPoint: any) {
    const h = categories
      .map(cat => {
        const dataPointValue = dataPoint[cat.id]
        const val = !isNaN(dataPointValue) ? Number(dataPointValue) : dataPointValue
        return val !== 0 && !val ? result.postProcessingConfig.NOVALUE : val
      })
      .join(uniqueSeparatorString)
    return h
  }

  function getCombinations(valueIndex: number) {
    if (valueIndex === categories.length) {
      const baseData: any = {}
      measures.forEach(meas => {
        if (boxplot) {
          baseData.values = [0, 0, 0, 0, 0]
          baseData.NUM_ENTRIES = 0
          baseData.keys = ['MIN_VAL', 'Q1', 'MEDIAN', 'Q3', 'MAX_VAL']
        } else {
          baseData[meas.id] = 0
        }
      })
      return [baseData]
    }

    const category = categories[valueIndex]
    const combinations = []
    const prevData = getCombinations(valueIndex + 1)

    valueRanges[category.id].forEach(value => {
      prevData.forEach(pRes => {
        const tmp = cloneJson(pRes)
        tmp[category.id] = value
        combinations.push(tmp)
      })
    })
    return combinations
  }

  const data = getCombinations(0)
  const lookup = {}
  data.forEach(dataPoint => {
    lookup[hash(dataPoint)] = dataPoint
  })

  const newResult = { ...cloneJson(result), data } as IMRIEndpointResultType
  result.data.forEach(dataPoint => {
    const h = hash(dataPoint)
    assert(h in lookup, 'Could not find datapoint')
    measures.forEach(meas => {
      if (boxplot) {
        lookup[h].values = dataPoint.values
        lookup[h].NUM_ENTRIES = dataPoint.NUM_ENTRIES
      } else {
        lookup[h][meas.id] = dataPoint[meas.id]
      }
    })
  })
  return newResult
}

export function _getFullValueRange(data: any[], category: IMRIEndpointResultCategoryType, NOVALUE: string) {
  const valueSet = {}

  for (let i = 0; i < data.length; i++) {
    const value = data[i][category.id]
    valueSet[value] = null
  }

  const sortFn = (a: StringOrNumber, b: StringOrNumber) => {
    if (b === NOVALUE) {
      return 1
    }
    if (a === NOVALUE) {
      return -1
    }
    if (a < b) {
      return -1
    }
    if (a > b) {
      return 1
    }
    return 0
  }

  let unfilledValueRange: StringOrNumber[] = Object.keys(valueSet)
  if (category.type === 'num') {
    unfilledValueRange = unfilledValueRange.map(unfilledValueRangeData => {
      /**
       * if data === "NoValue" then it must remain as it is (no conversion)
       */
      const parsed = parseFloat(String(unfilledValueRangeData))
      return isNaN(parsed) ? unfilledValueRangeData : parsed
    })
  }

  const sortedUnfilledValueRange = unfilledValueRange.sort(sortFn)

  const values: StringOrNumber[] = category.binsize ? [] : sortedUnfilledValueRange

  if (category.binsize) {
    for (let i = 0; i < sortedUnfilledValueRange.length; i++) {
      const curValue = sortedUnfilledValueRange[i]
      if (values.length === 0 || isNaN(Number(curValue))) {
        values.push(curValue)
      } else {
        let previousBinValue = Number(values[values.length - 1])
        if (!isNaN(previousBinValue)) {
          while (Number(curValue) - previousBinValue > 1.1 * category.binsize) {
            const value = previousBinValue + category.binsize
            values.push(value)
            previousBinValue = value
          }
        }
        values.push(curValue)
      }
    }
  }

  return values
}

/**
 *
 * If a category uses binning replace the labels for binned attributes
 * with range for the bin, e.g. 10 -> 10 - 20.
 *
 */
export function formatBinningLabels(result: IMRIEndpointResultType) {
  const newResult = cloneJson(result)
  for (let i = 0; i < newResult.data.length; i++) {
    const dataPoint = newResult.data[i]
    newResult.categories.forEach(category => {
      const value = dataPoint[category.id]
      dataPoint[category.id] = makeBinLabel(value, category, result.postProcessingConfig.NOVALUE)
    })
  }

  return newResult
}

export function makeBinLabel(
  value: null | string | number,
  category: undefined | IMRIEndpointResultCategoryType,
  NOVALUE: string
) {
  if (value === null || value === NOVALUE) {
    return NOVALUE
  } else if (!category) {
    return value
  }
  const valueNum = parseFloat(String(value))
  if (category.type === 'num') {
    if (category.binsize) {
      const from = valueNum < 0 ? `(${valueNum})` : `${valueNum}`
      const toNum = valueNum + category.binsize
      const to = toNum < 0 ? `(${toNum})` : `${toNum}`
      return `${from} - ${to}`
    }
    return valueNum < 0 ? `(${valueNum})` : valueNum
  }
  return value
}

export function postProcessBarChartData(preProcessedData: IMRIEndpointResultType) {
  let result = preProcessedData

  if (result.postProcessingConfig) {
    if (result.postProcessingConfig.fillMissingValuesEnabled) {
      result = fillMissingValues(result)
    } else {
      result = formatData(result, result.postProcessingConfig.NOVALUE)
    }
    if (result.postProcessingConfig.shouldFormatBinningLabels) {
      result = formatBinningLabels(result)
    }
  }

  return result
}

/**
 * fillMissingValues is now optional. However, fillMissingValues converts result.data[<category>] to string and
 * the tests expects them to be strings. formatData converts it to string
 */
function formatData(result: IMRIEndpointResultType, NOVALUE: string) {
  result.data.forEach(datapoint =>
    result.categories.forEach(cat => (datapoint[cat.id] = datapoint[cat.id] ? datapoint[cat.id].toString() : NOVALUE))
  )
  return result
}
