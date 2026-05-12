import AxisModel from '../../lib/models/AxisModel'
import MriFrontendConfig from '../../lib/MriFrontEndConfig'

const isYYYYMMDD = (value: unknown): value is string => {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const formatTimeConstraintValue = (value: unknown): string => {
  if (isYYYYMMDD(value)) {
    return value
  }

  const date = value instanceof Date ? value : new Date(String(value))
  if (isNaN(date.getTime())) {
    return String(value)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateTimeConstraintValue = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value))
  if (isNaN(date.getTime())) {
    return String(value)
  }

  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hour = pad2(date.getHours())
  const minute = pad2(date.getMinutes())
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const buildTimeRangeLabel = (expressions: { operator: string; value: string }[]): string | null => {
  if (!Array.isArray(expressions) || expressions.length < 2) {
    return null
  }

  const lower = expressions.find(expression => expression.operator === '>=')
  const upper = expressions.find(expression => expression.operator === '<=')
  if (!lower || !upper) {
    return null
  }

  const fromDate = formatTimeConstraintValue(lower.value)
  const toDate = formatTimeConstraintValue(upper.value)
  return `${fromDate} - ${toDate}`
}

const buildDateTimeRangeLabel = (expressions: { operator: string; value: string }[]): string | null => {
  if (!Array.isArray(expressions) || expressions.length < 2) {
    return null
  }

  const lower = expressions.find(expression => expression.operator === '>=')
  const upper = expressions.find(expression => expression.operator === '<=')
  if (!lower || !upper) {
    return null
  }

  const fromDate = formatDateTimeConstraintValue(lower.value)
  const toDate = formatDateTimeConstraintValue(upper.value)
  return `${fromDate} - ${toDate}`
}

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
              const attributeType = getAttributeType(attributes.content[iii].configPath)
              const visibleConstraints = []
              const constraints = attributes.content[iii].constraints

              for (let iv = 0; iv < constraints.content.length; iv += 1) {
                if (constraints.content[iv].content) {
                  if (attributeType === 'time') {
                    const rangeLabel = buildTimeRangeLabel(constraints.content[iv].content)
                    if (rangeLabel) {
                      visibleConstraints.push(rangeLabel)
                      continue
                    }
                  }

                  if (attributeType === 'datetime') {
                    const rangeLabel = buildDateTimeRangeLabel(constraints.content[iv].content)
                    if (rangeLabel) {
                      visibleConstraints.push(rangeLabel)
                      continue
                    }
                  }

                  for (let v = 0; v < constraints.content[iv].content.length; v += 1) {
                    const formattedValue =
                      attributeType === 'time'
                        ? formatTimeConstraintValue(constraints.content[iv].content[v].value)
                        : attributeType === 'datetime'
                          ? formatDateTimeConstraintValue(constraints.content[iv].content[v].value)
                          : constraints.content[iv].content[v].value
                    const visibleConstraint = `${constraints.content[iv].content[v].operator}${formattedValue}`
                    visibleConstraints.push(visibleConstraint)
                  }
                } else if (constraints.content[iv].operator === '=') {
                  if (isConceptSet) {
                    const conceptSets = getDomainValues('conceptSets')
                    const conceptSetName = conceptSets?.values?.find(
                      set => set.value === constraints.content[iv].value
                    )?.text
                    const visibleConstraint = conceptSetName || constraints.content[iv].value
                    visibleConstraints.push(visibleConstraint)
                  } else {
                    const visibleConstraint =
                      attributeType === 'time'
                        ? formatTimeConstraintValue(constraints.content[iv].value)
                        : attributeType === 'datetime'
                          ? formatDateTimeConstraintValue(constraints.content[iv].value)
                          : constraints.content[iv].value
                    visibleConstraints.push(visibleConstraint)
                  }
                } else {
                  const formattedValue =
                    attributeType === 'time'
                      ? formatTimeConstraintValue(constraints.content[iv].value)
                      : attributeType === 'datetime'
                        ? formatDateTimeConstraintValue(constraints.content[iv].value)
                        : constraints.content[iv].value
                  const visibleConstraint = `${constraints.content[iv].operator}${formattedValue}`
                  visibleConstraints.push(visibleConstraint)
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
