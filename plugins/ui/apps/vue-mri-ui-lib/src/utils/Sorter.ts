const sorter: any = {}

function removeBracket(st) {
  if (st && typeof st === 'string' && st[0] === '(' && st[st.length - 1] === ')') {
    return st.substring(1, st.length - 1)
  }
  return st
}

/**
 * Build Sortable Categories Object which will be used by this sort.
 * The object contain path, type, and binning information of the axis
 * @param   {object}    data    Response from a backend query. Should contain categories data.
 * @returns {object[]}  Array of object containing the axes information to be sorted.
 */
sorter.buildSortableCategories = data => {
  const sortableCategories = []
  const secondaryPriority = []
  for (let i = 0; i < data.categories.length; i += 1) {
    if (data.categories[i].axis === 1 && data.categories[i].id !== 'dummy_category') {
      const obj = {
        id: data.categories[i].id,
        type: data.categories[i].type,
        binsize: data.categories[i].binsize,
      }
      sortableCategories.push(obj)
    } else if (data.categories[i].axis > 1 && data.categories[i].id !== 'dummy_category') {
      const obj = {
        id: data.categories[i].id,
        type: data.categories[i].type,
        binsize: data.categories[i].binsize,
        axis: data.categories[i].axis,
      }
      secondaryPriority.push(obj)
    }
  }
  for (let i = 0; i < secondaryPriority.length; i += 1) {
    sortableCategories.push(secondaryPriority[i])
  }
  return sortableCategories
}

/**
 * A reccursive function to sort data according to the category available
 * @param   {object[]}  constantCategories  Array of object containing the sortable categories.
 * Produced by calling buildSortableCategories function below.
 * @param   {object[]}  data                Array of object containing the data to be sorted.
 * @param   {string}    sorttype            Ascending or Descending Sorting. Should contain either
 * MRI_PA_CHART_SORT_ASCENDING or MRI_PA_CHART_SORT_DESCENDING
 * @param   {int}       categoryIndex       Sorting Level. 0 Corresponds to sorting of X1,
 * 1 Corresponds to sorting of X2, etc.
 * @returns {object[]}  Resulting sorted data
 */
sorter.sortCategory = (constantCategories, data, sortType, categoryIndex) => {
  if (!data || data.length === 0) {
    return []
  }
  if (!constantCategories || !constantCategories[categoryIndex]) {
    return data
  }

  if (constantCategories[categoryIndex].axis && sortType !== 'MRI_PA_CHART_SORT_ASCENDING') {
    return sorter.sortCategory(constantCategories, data, 'MRI_PA_CHART_SORT_ASCENDING', categoryIndex)
  }

  const currentCategorySorted = JSON.parse(JSON.stringify(data))
  const physicalData = []

  const sortedCategories = constantCategories[categoryIndex].id
  const sortFunction =
    sortType === 'MRI_PA_CHART_SORT_ASCENDING'
      ? function sort(a, b) {
          if (a[sortedCategories] === 'NoValue' || a[sortedCategories] === 'No Value') {
            return -1
          }
          if (b[sortedCategories] === 'NoValue' || b[sortedCategories] === 'No Value') {
            return 1
          }
          if (!isNaN(a[sortedCategories]) && !isNaN(b[sortedCategories])) {
            return a[sortedCategories] - b[sortedCategories]
          }
          if (
            constantCategories[categoryIndex].type === 'num' &&
            !isNaN(parseFloat(removeBracket(a[sortedCategories]))) &&
            !isNaN(parseFloat(removeBracket(b[sortedCategories])))
          ) {
            return parseFloat(removeBracket(a[sortedCategories])) - parseFloat(removeBracket(b[sortedCategories]))
          }
          if (constantCategories[categoryIndex].binsize) {
            return (
              parseFloat(removeBracket(a[sortedCategories].split(' - ').pop())) -
              parseFloat(removeBracket(b[sortedCategories].split(' - ').pop()))
            )
          }
          return a[sortedCategories].localeCompare(b[sortedCategories])
        }
      : function sort(a, b) {
          if (a[sortedCategories] === 'NoValue' || a[sortedCategories] === 'No Value') {
            return -1
          }
          if (b[sortedCategories] === 'NoValue' || b[sortedCategories] === 'No Value') {
            return 1
          }
          if (!isNaN(a[sortedCategories]) && !isNaN(b[sortedCategories])) {
            return b[sortedCategories] - a[sortedCategories]
          }
          if (
            constantCategories[categoryIndex].type === 'num' &&
            !isNaN(parseFloat(removeBracket(a[sortedCategories]))) &&
            !isNaN(parseFloat(removeBracket(b[sortedCategories])))
          ) {
            return parseFloat(removeBracket(b[sortedCategories])) - parseFloat(removeBracket(a[sortedCategories]))
          }
          if (constantCategories[categoryIndex].binsize) {
            return (
              parseFloat(removeBracket(b[sortedCategories].split(' - ').pop())) -
              parseFloat(removeBracket(a[sortedCategories].split(' - ').pop()))
            )
          }
          return b[sortedCategories].localeCompare(a[sortedCategories])
        }

  currentCategorySorted.sort(sortFunction)
  let currentCategoryValue = currentCategorySorted[0][sortedCategories]
  let nextCategorySorting = []
  let nextCategorySorted
  for (let i = 0; i < currentCategorySorted.length; i += 1) {
    if (currentCategorySorted[i][sortedCategories] === currentCategoryValue) {
      nextCategorySorting.push(currentCategorySorted[i])
    } else {
      nextCategorySorted = nextCategorySorting

      if (categoryIndex < constantCategories.length - 1) {
        nextCategorySorted = sorter.sortCategory(constantCategories, nextCategorySorting, sortType, categoryIndex + 1)
      }

      for (let ii = 0; ii < nextCategorySorted.length; ii += 1) {
        physicalData.push(nextCategorySorted[ii])
      }

      nextCategorySorting = []
      nextCategorySorting.push(currentCategorySorted[i])
      currentCategoryValue = currentCategorySorted[i][sortedCategories]
    }
  }

  nextCategorySorted = nextCategorySorting
  if (categoryIndex < constantCategories.length - 1) {
    nextCategorySorted = sorter.sortCategory(constantCategories, nextCategorySorting, sortType, categoryIndex + 1)
  }

  for (let ii = 0; ii < nextCategorySorted.length; ii += 1) {
    physicalData.push(nextCategorySorted[ii])
  }

  return physicalData
}

export default sorter
