import AxisModel from '../../lib/models/AxisModel'
import MriFrontendConfig from '../../lib/MriFrontEndConfig'

export const getAttributeName = ({
  attributeId,
  type,
  mriFrontEndConfig,
}: {
  attributeId?: string
  type: string
  mriFrontEndConfig: MriFrontendConfig
}) => {
  try {
    /* Note: This is the current Implementation of Bookmark Rendering. */
    if (attributeId) {
      const attributePath = attributeId.split('.')
      if (attributePath.length > 3 && type !== 'list') {
        const attributePathEnd1 = attributePath.pop()
        const attributePathEnd2 = attributePath.pop()
        attributePath.pop()
        attributePath.push(attributePathEnd2)
        attributePath.push(attributePathEnd1)
      }
      const attributeConfigPath = attributePath.join('.')
      const attribute = mriFrontEndConfig.getAttributeByPath(attributeConfigPath)
      if (attribute && attribute.oInternalConfigAttribute && attribute.oInternalConfigAttribute.name) {
        return attribute.oInternalConfigAttribute.name
      }
    }
    return attributeId
  } catch (e) {
    console.error(e)
    throw e
  }
}

export const getAxisFormatted = (
  axis,
  type,
  mriFrontEndConfig: MriFrontendConfig,
  getAxis: (id: number) => AxisModel
) => {
  const returnObj = []
  if (!mriFrontEndConfig) {
    return returnObj
  }
  if (type === 'list') {
    const tempObject = {}
    let count = 0
    Object.keys(axis).forEach(key => {
      tempObject[axis[key]] = key
      count += 1
    })
    for (let i = 0; i < count; i += 1) {
      returnObj.push({
        name: getAttributeName({ mriFrontEndConfig, attributeId: tempObject[i], type }),
      })
    }
  } else {
    for (let i = 0; i < axis.length; i += 1) {
      if (axis[i].attributeId !== 'n/a') {
        const axisModel = getAxis(i)
        returnObj.push({
          name: `= ${getAttributeName({ attributeId: axis[i].attributeId, type, mriFrontEndConfig })}`,
          icon: axisModel.props.icon,
          iconGroup: axisModel.props.iconFamily,
        })
      }
    }
  }
  return returnObj
}

export const getCardsFormatted = ({
  mriFrontEndConfig,
  boolContainers,
  getText,
  getAttributeType,
  getDomainValues,
}: {
  mriFrontEndConfig: MriFrontendConfig
  boolContainers: FilterCardContent[]
  getText: (key: string) => string | undefined
  getAttributeType: (configPath: string) => string | undefined
  getDomainValues: (type: string) => { values: { value: string; text: string }[] | undefined } | undefined
}) => {
  const returnObj: {
    content: {
      visibleAttributes: any[]
      name: string
    }[]
  }[] = []
  if (!mriFrontEndConfig) {
    return returnObj
  }
  for (let i = 0; i < boolContainers.length; i += 1) {
    try {
      if (boolContainers[i].content.length > 0) {
        const content: {
          visibleAttributes: any[]
          name: string
        }[] = []
        for (let ii = 0; ii < boolContainers[i].content.length; ii += 1) {
          const visibleAttributes = []
          let attributes = boolContainers[i].content[ii].attributes
          let filterCardName =
            !boolContainers[i].content[ii].name && boolContainers[i].content[ii].instanceID === 'patient'
              ? getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
              : boolContainers[i].content[ii].name
          if (boolContainers[i].content[ii].op && boolContainers[i].content[ii].op === 'NOT') {
            // Excluded filtercard
            attributes = boolContainers[i].content[ii].content[0].attributes
            filterCardName = `${boolContainers[i].content[ii].content[0].name} (${getText('MRI_PA_LABEL_EXCLUDED')})`
          }
          for (let iii = 0; iii < attributes.content.length; iii += 1) {
            if (attributes.content[iii].constraints.content && attributes.content[iii].constraints.content.length > 0) {
              const name = getAttributeName({
                mriFrontEndConfig,
                attributeId: attributes.content[iii].configPath,
                type: 'list',
              })
              const isConceptSet = getAttributeType(attributes.content[iii].configPath) === 'conceptSet'
              const visibleConstraints = []
              const constraints = attributes.content[iii].constraints
              for (let iv = 0; iv < constraints.content.length; iv += 1) {
                if (constraints.content[iv].content) {
                  for (let v = 0; v < constraints.content[iv].content.length; v += 1) {
                    visibleConstraints.push(
                      `${constraints.content[iv].content[v].operator}${constraints.content[iv].content[v].value}`
                    )
                  }
                } else if (constraints.content[iv].operator === '=') {
                  if (isConceptSet) {
                    const conceptSets = getDomainValues('conceptSets')
                    const conceptSetName = conceptSets?.values?.find(
                      set => set.value === constraints.content[iv].value
                    )?.text
                    visibleConstraints.push(conceptSetName || constraints.content[iv].value)
                  } else {
                    visibleConstraints.push(constraints.content[iv].value)
                  }
                } else {
                  visibleConstraints.push(`${constraints.content[iv].operator}${constraints.content[iv].value}`)
                }
              }
              const attributeObj = {
                name,
                visibleConstraints,
              }
              visibleAttributes.push(attributeObj)
            }
          }
          const filterCardObj = {
            visibleAttributes,
            name: `${filterCardName}`,
          }
          content.push(filterCardObj)
        }
        const boolContainerObj = {
          content,
        }
        returnObj.push(boolContainerObj)
      }
    } finally {
      // Handle Incorrect Bookmark Formatting
    }
  }
  return returnObj
}

