import type { QueryFilterEvent, QueryFilterAttribute } from '../../types/QueryFilterTypes'
import { hasAttributeId, isNumericRangeAttribute } from './type-guards'

// Transform events from new structure to internal structure
export const transformEvents = (events: QueryFilterEvent[]): QueryFilterEvent[] => {
  const transformedEvents: QueryFilterEvent[] = []

  events.forEach(event => {
    const processedAttributes: QueryFilterAttribute[] = []
    const remainingAttributes: QueryFilterAttribute[] = []

    // Main event
    const mainEvent: QueryFilterEvent = {
      id: event.id,
      conceptSet: event.conceptSet || '',
      conceptSetId: event.conceptSetId,
      conceptSetDetails: event.conceptSetDetails,
      selectedConceptSet: event.selectedConceptSet,
      conceptSetLoading: event.conceptSetLoading,
      criteriaType: event.criteriaType,
      eventType: event.eventType,
      isExpanded: event.isExpanded,
      cardinality: event.cardinality,
      attributes: [], // Will be populated with remaining attributes
      // Preserve nestedCriteria for group events
      ...(event.nestedCriteria && {
        nestedCriteria: {
          ...event.nestedCriteria,
          events: transformEvents(event.nestedCriteria.events || []),
        },
      }),
    }
    transformedEvents.push(mainEvent)

    // Process attributes - keep original attributes format
    if (event.attributes && event.attributes.length > 0) {
      event.attributes.forEach(attr => {
        // Normalize attributeType from either attributeType or type field
        const attributeType = attr.attributeType
        const configType = 'configType' in attr ? attr.configType : 'conceptSet'
        if (attributeType === 'nested' && attr.nestedCriteria) {
          // Keep nested criteria in the attributes format, just process the events
          const attrId = attr.id
          const processedAttr: QueryFilterAttribute = {
            id: attrId,
            attributeId: 'attributeId' in attr && attr.attributeId ? attr.attributeId : attrId, // Preserve or set attributeId
            attributeType: 'nested',
            nestedCriteria: {
              ...attr.nestedCriteria,
              events: transformNestedEvents(attr.nestedCriteria.events || [], mainEvent.id),
            },
          }
          remainingAttributes.push(processedAttr)
          processedAttributes.push(attr)
        } else if (
          hasAttributeId(attr) &&
          attributeType &&
          attributeType !== 'nested' &&
          (configType === 'conceptSet' ||
            configType === 'concept' ||
            configType === 'numericRange' ||
            configType === 'dateRange')
        ) {
          const attributeId = attr.attributeId

          // Also add to selectedAttributes for tracking
          if (!mainEvent.selectedAttributes) {
            mainEvent.selectedAttributes = []
          }
          mainEvent.selectedAttributes.push(attributeId)

          // Keep all attributes in remainingAttributes for demographic events
          if (mainEvent.eventType === 'demographic') {
            remainingAttributes.push(attr)
          }
          // Keep concept-based attributes (like gender) in the attributes array for UI compatibility
          else if (attributeType === 'standard' && 'conceptItems' in attr && attr.conceptItems) {
            remainingAttributes.push(attr)
          } else {
            // For other attribute types (like age) on non-demographic events
            mainEvent.attributeConfig = {
              id: attributeId,
              name: attributeId,
              description: '',
              type: attributeType,
              category: 'criteria-specific',
            }

            if (isNumericRangeAttribute(attr)) {
              mainEvent.attributeConfig.operator = attr.operator || 'GREATER_THAN'
              mainEvent.attributeConfig.value = attr.value ? parseInt(attr.value) : undefined
            }

            processedAttributes.push(attr)
          }
        } else {
          remainingAttributes.push(attr)
        }
      })
    }
    mainEvent.attributes = remainingAttributes

    // Populate selectedAttributes with attributeId for each processed attribute
    if (remainingAttributes.length > 0) {
      if (!mainEvent.selectedAttributes) {
        mainEvent.selectedAttributes = []
      }
      remainingAttributes.forEach(attr => {
        if ('attributeId' in attr && attr.attributeId && !mainEvent.selectedAttributes.includes(attr.attributeId)) {
          mainEvent.selectedAttributes.push(attr.attributeId)
        }
      })
    }
  })

  return transformedEvents
}

export const transformNestedEvents = (events: QueryFilterEvent[], parentId: string): QueryFilterEvent[] => {
  return events.map(event => {
    const nestedChildEvent: QueryFilterEvent = {
      id: event.id,
      conceptSet: event.conceptSet || '',
      conceptSetId: event.conceptSetId,
      conceptSetDetails: event.conceptSetDetails,
      selectedConceptSet: event.selectedConceptSet,
      conceptSetLoading: event.conceptSetLoading,
      criteriaType: event.criteriaType,
      eventType: event.eventType,
      isExpanded: event.isExpanded,
      cardinality: event.cardinality,
      parentEventId: parentId,
      selectedAttributes: event.selectedAttributes, // Preserve selectedAttributes from import
    }

    if (event.attributes && event.attributes.length > 0) {
      nestedChildEvent.attributes = event.attributes.map(attr => {
        const attributeType = attr.attributeType

        if (attributeType === 'nested' && attr.nestedCriteria) {
          const attrId = attr.id
          return {
            id: attrId,
            attributeId: 'attributeId' in attr && attr.attributeId ? attr.attributeId : attrId, // Preserve or set attributeId
            attributeType: 'nested',
            nestedCriteria: {
              ...attr.nestedCriteria,
              events: transformNestedEvents(attr.nestedCriteria.events || [], nestedChildEvent.id),
            },
          }
        }
        return attr
      })
    }

    return nestedChildEvent
  })
}
