import type { QueryFilterGroup, QueryFilterEvent } from '../../types/QueryFilterTypes'
import type { ConceptSet } from '../../types/AtlasTypes'

/**
 * Collects concept sets from nested criteria in groups
 */
export const collectNestedConceptSets = (
  groups: QueryFilterGroup[],
  systemIdToAtlasId: Map<string, number>,
  usedConceptSetIds: Set<string>,
  conceptSets: ConceptSet[]
): void => {
  groups.forEach(group => {
    if (group.events) {
      collectNestedConceptSetsFromEvents(group.events, systemIdToAtlasId, usedConceptSetIds, conceptSets)
    }
  })
}

/**
 * Helper method to collect concept sets from events and their nested attributes
 */
export const collectNestedConceptSetsFromEvents = (
  events: QueryFilterEvent[],
  systemIdToAtlasId: Map<string, number>,
  usedConceptSetIds: Set<string>,
  conceptSets: ConceptSet[]
): void => {
  events.forEach(event => {
    // Check if this event has attributes with nested events
    if (event.attributes) {
      event.attributes.forEach(attr => {
        // Look for nested criteria with events that have concept sets
        if (attr.attributeType === 'nested' && attr.nestedCriteria?.events) {
          attr.nestedCriteria.events.forEach(nestedEvent => {
            // This is the key check - nested events with concept sets that weren't collected initially
            if (nestedEvent.conceptSetDetails && nestedEvent.conceptSetDetails.length > 0 && nestedEvent.conceptSetId) {
              const systemConceptSetId = nestedEvent.conceptSetId
              if (!usedConceptSetIds.has(systemConceptSetId)) {
                usedConceptSetIds.add(systemConceptSetId)
                const atlasSequentialId = conceptSets.length
                systemIdToAtlasId.set(systemConceptSetId, atlasSequentialId)

                const conceptSetDef: ConceptSet = {
                  id: atlasSequentialId,
                  name: nestedEvent.conceptSet || `Concept Set ${systemConceptSetId}`,
                  expression: {
                    items: nestedEvent.conceptSetDetails,
                  },
                }

                // Add conceptSetId field with system database ID
                conceptSetDef.conceptSetId = parseInt(systemConceptSetId)
                conceptSets.push(conceptSetDef)
              }
            }
          })

          // Recursively process further nested levels
          collectNestedConceptSetsFromEvents(
            attr.nestedCriteria.events,
            systemIdToAtlasId,
            usedConceptSetIds,
            conceptSets
          )
        }
      })
    }

    // Check if this event has nestedCriteria (for group events)
    if (event.nestedCriteria?.events) {
      event.nestedCriteria.events.forEach(nestedEvent => {
        // Collect concept sets from group events
        if (nestedEvent.conceptSetDetails && nestedEvent.conceptSetDetails.length > 0 && nestedEvent.conceptSetId) {
          const systemConceptSetId = nestedEvent.conceptSetId
          if (!usedConceptSetIds.has(systemConceptSetId)) {
            usedConceptSetIds.add(systemConceptSetId)
            const atlasSequentialId = conceptSets.length
            systemIdToAtlasId.set(systemConceptSetId, atlasSequentialId)

            const conceptSetDef: ConceptSet = {
              id: atlasSequentialId,
              name: nestedEvent.conceptSet || `Concept Set ${systemConceptSetId}`,
              expression: {
                items: nestedEvent.conceptSetDetails,
              },
            }

            // Add conceptSetId field with system database ID
            conceptSetDef.conceptSetId = parseInt(systemConceptSetId)
            conceptSets.push(conceptSetDef)
          }
        }
      })

      // Recursively process further nested levels in group events
      collectNestedConceptSetsFromEvents(event.nestedCriteria.events, systemIdToAtlasId, usedConceptSetIds, conceptSets)
    }
  })
}
