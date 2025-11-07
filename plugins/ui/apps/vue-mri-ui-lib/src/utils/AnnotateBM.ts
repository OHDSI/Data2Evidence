import BMv2Parser from '../lib/bookmarks/BMv2Parser'

/**
 * Retrieves annotation value or attribute name depending on option
 * @param   {string}    opt         Should have a value of "annotate" or "deannotate"
 * @param   {object}    oConfig     MriFrontendConfig
 * @param   {string}    path        attribute path
 * @param   {string}    name        attribute name/ annotation value
 * @returns {string[]}  string array of substitute attribute names/ annotation
 */
function getSubstitute(opt, oConfig, path, name) {
  const interPath = oConfig.getInterHavingAttrAnnotation(name)
  switch (opt) {
    case 'annotate':
      return oConfig.getAnnotationByPath(path)
    case 'deannotate':
      if (interPath.length > 0) {
        const fc = oConfig.getFilterCardByPath(interPath)
        return fc.getAttributesWithAnnotation(name)
      }
      return []
    default:
      throw new Error(`${opt}is not a valid option`)
  }
}

// TODO
function isAttribute(ifrObj) {
  return ifrObj && ifrObj.type === 'Attribute'
}

/**
 * Traverses IFR, maps attribute names to annotation values or vice versa
 * @param   {object}  oIFR        IFR object
 * @param   {object}  oConfig     MriFrontendConfig
 * @param   {string}  opt         Should have a value of "annotate" or "deannotate"
 * @returns {object}              IFR object with attribute id replaced with annotation value
 */
function traverseIFR(oIFR, oConfig, opt) {
  if (oIFR instanceof Object) {
    Object.keys(oIFR).forEach(e => {
      if (isAttribute(oIFR[e])) {
        const attributeName = String(oIFR[e].configPath).split('.').pop()
        const substitute = getSubstitute(opt, oConfig, oIFR[e].configPath, attributeName)

        if (substitute && substitute.length > 0) {
          oIFR[e].instanceID = String(oIFR[e].instanceID).replace(attributeName, substitute[0])
          oIFR[e].configPath = String(oIFR[e].configPath).replace(attributeName, substitute[0])
        }
      } else {
        traverseIFR(oIFR[e], oConfig, opt)
      }
    })
  } else if (oIFR instanceof Array) {
    oIFR.forEach(e => {
      traverseIFR(e, oConfig, opt)
    })
  }
  return oIFR
}

/**
 * Traverses axis selection, maps attribute names to annotation values or vice versa
 * @param   {array}   oAxisSelection      list of axis selections
 * @param   {object}  oConfig             MriFrontendConfig
 * @param   {string}  opt                 Should have a value of "annotate" or "deannotate"
 * @returns {object}                      axis selections with attribute attributeId replaced
 * with annotation value
 */
function traverseAxisSelection(oAxisSelection, oConfig, opt) {
  oAxisSelection.forEach(e => {
    const id = typeof e === 'string' ? e : e.attributeId
    const substitute = getSubstitute(opt, oConfig, id, String(id).split('.').pop())
    const attributePath = String(id).split('.')
    if (substitute && substitute.length > 0) {
      attributePath.pop()
      attributePath.push(substitute[0])
      if (typeof e === 'string') {
        // tslint:disable-next-line:no-parameter-reassignment
        e = attributePath.join('.')
      } else {
        e.attributeId = attributePath.join('.')
      }
    }
  })
  return oAxisSelection
}

/**
 * Annotate bookmark
 * @param   {object}    oIFR                IFR object
 * @param   {array}     oAxisSelection      list of axis selections
 * @param   {object}    oConfig             MriFrontendConfig
 * @returns {object}    object with properties filter (IFR with annotated attribute
 * config paths) and annotated axis paths
 */
function annotate(oIFR, oAxisSelection, oConfig) {
  const filter = traverseIFR(oIFR, oConfig, 'annotate')
  const axisSelection = traverseAxisSelection(oAxisSelection, oConfig, 'annotate')
  filter.axes = axisSelection
  return filter
}

/**
 * Deannotate bookmark
 * @param   {object}    oIFR                IFR object
 * @param   {array}     oAxisSelection      list of axis selections
 * @param   {object}    oConfig             MriFrontendConfig
 * @returns {object}   object with properties filter (IFR with deannotated
 * attribute config paths) and annotated axis paths
 */
function deannotate(oIFR, oAxisSelection, oConfig) {
  const filter = traverseIFR(oIFR, oConfig, 'deannotate')
  const axisSelection = traverseAxisSelection(oAxisSelection, oConfig, 'deannotate')
  filter.axes = axisSelection
  return filter
}

function traverseResponse(responseData, oConfig, opt) {
  responseData.categories.forEach(e => {
    const id = e.id
    const substitute = getSubstitute(opt, oConfig, id, String(id).split('.').pop())
    const attributePath = String(id).split('.')
    if (substitute && substitute.length > 0) {
      attributePath.pop()
      attributePath.push(substitute[0])
      e.id = attributePath.join('.')
    }
    if (e.value) {
      const value = e.value.substring(1, e.value.length - 1)
      const substituteValue = getSubstitute(opt, oConfig, value, String(value).split('.').pop())
      const attributePathValue = String(value).split('.')
      if (substituteValue && substituteValue.length > 0) {
        attributePathValue.pop()
        attributePathValue.push(substitute[0])
        const newValue = attributePathValue.join('.')
        e.value = `{${newValue}}`

        responseData.data.forEach(datum => {
          if (datum[value]) {
            const val = datum[value]
            delete datum[value]
            datum[newValue] = val
          }
        })
      }
    }
  })
  responseData.measures.forEach(e => {
    const id = e.id
    const substitute = getSubstitute(opt, oConfig, id, String(id).split('.').pop())
    const attributePath = String(id).split('.')
    if (substitute && substitute.length > 0) {
      attributePath.pop()
      attributePath.push(substitute[0])
      e.id = attributePath.join('.')
    }
    if (e.value) {
      const value = e.value.substring(1, e.value.length - 1)
      const substituteValue = getSubstitute(opt, oConfig, value, String(value).split('.').pop())
      const attributePathValue = String(value).split('.')
      if (substituteValue && substituteValue.length > 0) {
        attributePathValue.pop()
        attributePathValue.push(substitute[0])
        const newValue = attributePathValue.join('.')
        e.value = `{${newValue}}`

        responseData.data.forEach(datum => {
          if (datum[value]) {
            const val = datum[value]
            delete datum[value]
            datum[newValue] = val
          }
        })
      }
    }
  })
  return responseData
}

function annotateResponse(responseData, oConfig) {
  return traverseResponse(responseData, oConfig, 'annotate')
}

function deannotateResponse(responseData, oConfig) {
  return traverseResponse(responseData, oConfig, 'deannotate')
}

function generateRequestFromBookmark(bookmark) {
  const ifrComponent = BMv2Parser.convertBM2IFR(bookmark.filter)

  const cards = ifrComponent.cards
  const configData = {
    configId: '',
    configVersion: '',
  }
  const axes = []

  if (ifrComponent.configMetadata) {
    configData.configId = ifrComponent.configMetadata.id
    configData.configVersion = ifrComponent.configMetadata.version
  }

  for (let i = 0; i < bookmark.axisSelection.length; i += 1) {
    if (bookmark.axisSelection[i] && bookmark.axisSelection[i].attributeId !== 'n/a') {
      const attributeId = bookmark.axisSelection[i].attributeId
      const categoryId = bookmark.axisSelection[i].categoryId
      const attributeIdArray = attributeId.split('.')
      attributeIdArray.pop()
      attributeIdArray.pop()
      const instanceID = attributeIdArray.join('.')
      if (attributeIdArray.length > 1) {
        attributeIdArray.pop()
      }
      const configPath = attributeIdArray.join('.')

      const axisInfo: any = {
        configPath,
        instanceID,
        axis: categoryId[0],
        seq: parseInt(categoryId[1], 10),
        id: attributeId,
      }
      if (bookmark.axisSelection[i].binsize && bookmark.axisSelection[i].binsize !== 'n/a') {
        axisInfo.binsize = bookmark.axisSelection[i].binsize
      }
      axes.push(axisInfo)
    }
  }

  return {
    cards,
    configData,
    axes,
  }
}

export default {
  annotate,
  deannotate,
  annotateResponse,
  deannotateResponse,
  generateRequestFromBookmark,
}
