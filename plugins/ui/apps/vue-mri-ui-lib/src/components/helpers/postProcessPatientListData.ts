const pidAttributeSuffixPath = 'attributes.pid'

interface IPatientListResponse {
  data: any[]
  sql: string
  totalPatientCount: number
  noDataReason?: string
}
export const postProcessPatientListData = (response: IPatientListResponse) => {
  response.data = buildJSON(response.data)
  return response
}

export function buildJSON(aResult: any[]) {
  const oData = []
  // references results from patient table query (if any) for result merging
  let oAnchor
  if (aResult.filter(r => r.entity === 'patient').length !== 1) {
    oAnchor = aResult[0]
  } else {
    oAnchor = aResult.filter(r => r.entity === 'patient')[0]
    aResult = aResult.filter(r => r.entity !== oAnchor.entity)
  }
  // maps configpath with defaultfilterkey
  let sCurrPID
  let oPatient: any = {}
  oAnchor.data.forEach(oDataRow => {
    const anchorPidAttribute = oDataRow[`${oAnchor.entity}.${pidAttributeSuffixPath}`]
    if (!arrayBufferEquals(sCurrPID, anchorPidAttribute)) {
      sCurrPID = anchorPidAttribute
      oDataRow[`${oAnchor.entity}.${pidAttributeSuffixPath}`] = anchorPidAttribute.toString()
      oPatient = oAnchor.entity === 'patient' ? oDataRow : { 'patient.attributes.pid': sCurrPID.toString() }
      aResult.forEach(oDataSet => {
        const interactionKey = oDataSet.entity
        oPatient[interactionKey] =
          oDataSet.data.length > 0 ? _buildInteractionJSON(interactionKey, oDataSet.data, sCurrPID) : []
      })
      oData.push(oPatient)
    }
  })
  return oData
}

/**
 * Compares two array buffers for the string contents to check if they are exactly equal.
 * @param   {Uint8Array}  o1 First object
 * @param   {Uint8Array}  o2 Second object
 * @returns {Boolean} True, if string contents are equal.
 */
export function arrayBufferEquals(a: any, b: any) {
  return a && b ? a.toString() === b.toString() : false
}

function _buildInteractionJSON(entityConfigPath: string, oDataSet: any[], sKey: string): object[] {
  const nStartIdx = _binarySearch(oDataSet, entityConfigPath, sKey)
  if (nStartIdx === -1) {
    return []
  }
  const aInteractionList = []
  let oCurrRow

  for (let i = nStartIdx; i < oDataSet.length; i++) {
    oCurrRow = oDataSet[i]
    if (!arrayBufferEquals(oCurrRow[`${entityConfigPath}.${pidAttributeSuffixPath}`], sKey)) {
      return aInteractionList
    } else {
      // temp = JSON.parse(JSON.stringify(oCurrRow));
      aInteractionList.push(oCurrRow)
    }
  }
  return aInteractionList
}

function _binarySearch(arr, entityConfigPath, key) {
  let startIndex = 0
  let stopIndex = arr.length - 1
  let index = (startIndex + stopIndex) >> 1
  let currIndex
  const interactionPidAttribute = `${entityConfigPath}.${pidAttributeSuffixPath}`
  while (index >= 0 && !arrayBufferEquals(key, arr[index][interactionPidAttribute]) && startIndex < stopIndex) {
    if (key < arr[index][interactionPidAttribute]) {
      stopIndex = index - 1
    } else if (key > arr[index][interactionPidAttribute]) {
      startIndex = index + 1
    }

    index = (startIndex + stopIndex) >> 1
  }

  if (arr[index] && arrayBufferEquals(key, arr[index][interactionPidAttribute])) {
    currIndex = index
    // since array contains duplicate keys, we search up for the first occurance of the key
    while (currIndex >= 0 && arrayBufferEquals(key, arr[currIndex][interactionPidAttribute])) {
      --currIndex
      if (currIndex >= 0 && arrayBufferEquals(key, arr[currIndex][interactionPidAttribute])) {
        index = currIndex
      }
    }
    return index
  } else {
    return -1
  }
}
