import { reactive, computed, Ref } from 'vue'
import { QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import type { QueryFilterEvent, QueryFilterGroup } from '../types/QueryFilterTypes'
import type { ConceptSetItemDisplay } from '../types/ConceptSetTypes'
import { loadSingleConceptSetDetails } from '../services/ConceptSetApiService'

// Type definition for dataset ID getter function
type GetDatasetIdFunction = () => string | null

const criteriaManager = reactive(new QueryFilterCriteriaManager())

/**
 * Composable for managing criteria operations
 * Handles all QueryFilterCriteriaManager operations and event management
 */
export function useCriteriaManager(
  getDatasetId: GetDatasetIdFunction,
  allConceptSets: Ref<ConceptSetItemDisplay[]>,
  clearConceptSets: () => void
) {
  // Computed properties for reactive data access
  const primaryEventsData = computed(() => {
    return criteriaManager.getPrimaryEvents()
  })

  const criteriaData = computed(() => {
    return criteriaManager.getCriteria()
  })

  const exitCriteriaData = computed(() => {
    return criteriaManager.getCensoringCriteria()
  })

  const conceptSetsFromCriteria = computed(() => {
    const conceptSets: ConceptSetItemDisplay[] = []
    const seenIds = new Set<string>()

    const criteria = criteriaManager.getCriteria()
    criteria.criteria.forEach(group => {
      group.events.forEach(event => {
        if (event.conceptSetId && !seenIds.has(event.conceptSetId)) {
          const foundConceptSet = allConceptSets.value.find(
            cs => cs.value.toString() === event.conceptSetId!.toString()
          )
          if (foundConceptSet) {
            conceptSets.push(foundConceptSet)
            seenIds.add(event.conceptSetId)
          } else if (event.selectedConceptSet) {
            console.warn(`Concept set ${event.conceptSetId} not found in allConceptSets, using fallback`)
            // Convert SelectedConceptSet to ConceptSetItem
            const convertedConceptSet: ConceptSetItemDisplay = {
              value: event.selectedConceptSet.value?.toString() || event.conceptSetId,
              text: event.selectedConceptSet.text,
              display_value: event.selectedConceptSet.display_value,
              conceptIds: event.selectedConceptSet.conceptIds,
              concepts: event.selectedConceptSet.concepts,
            }
            conceptSets.push(convertedConceptSet)
            seenIds.add(event.conceptSetId)
          }
        }
      })
    })

    return conceptSets
  })

  // Event handlers for criteria updates
  const handleCriteriaUpdated = (updatedCriteriaManager: QueryFilterCriteriaManager) => {
    console.log('Criteria updated:', updatedCriteriaManager.toJSON())
  }

  const handleUpdateQualifyingLimit = (limit: 'ALL' | 'EARLIEST' | 'LATEST') => {
    criteriaManager.updateQualifyingEventsLimit(limit)
  }

  const handleUpdatePrimaryCriteriaLimit = (
    limit: 'ALL' | 'EARLIEST' | 'LATEST' | 'CONT_OBS' | 'FIXED' | 'CONT_DRUG'
  ) => {
    if (limit === 'ALL' || limit === 'EARLIEST' || limit === 'LATEST') {
      criteriaManager.updatePrimaryCriteriaLimit(limit)
    }
  }

  const handleUpdateExitStrategy = (limit: 'ALL' | 'EARLIEST' | 'LATEST' | 'CONT_OBS' | 'FIXED' | 'CONT_DRUG') => {
    if (limit === 'CONT_OBS' || limit === 'FIXED' || limit === 'CONT_DRUG') {
      criteriaManager.updateEndStrategy(limit)
    }
  }

  const handleUpdateEntryDays = (type: 'PRIOR' | 'POST', days: number) => {
    criteriaManager.updateEntryDays(type, days)
    console.log('Entry days updated:', days, 'Type:', type)
  }

  const handleUpdateFixedDuration = (eventDateOffset: 'StartDate' | 'EndDate', daysOffset: number) => {
    criteriaManager.updateFixedDuration(eventDateOffset, daysOffset)
    console.log('Fixed duration updated:', eventDateOffset, daysOffset)
  }

  const handleUpdateContDrugSettings = async (
    conceptSetId: string,
    conceptSetName: string,
    gapDays: number,
    offset: number,
    daysSupplyOverride: number
  ) => {
    // Find the concept set in allConceptSets to get its details
    const conceptSetItem = allConceptSets.value.find(cs => cs.value.toString() === conceptSetId)

    let conceptSetDetails: any[] | undefined

    if (conceptSetItem) {
      try {
        // Fetch concept set details
        conceptSetDetails = await loadSingleConceptSetDetails(conceptSetItem, getDatasetId())
      } catch (error) {
        console.error('Error loading CONT_DRUG concept set details:', error)
      }
    }

    criteriaManager.updateContDrugSettings(
      conceptSetId,
      conceptSetName,
      conceptSetDetails,
      gapDays,
      offset,
      daysSupplyOverride
    )
    console.log('CONT_DRUG settings updated:', { conceptSetId, conceptSetName, gapDays, offset, daysSupplyOverride })
  }

  const handleUpdatePrimaryEvents = (events: QueryFilterEvent[]) => {
    criteriaManager.updatePrimaryEvents(events)
  }

  const handleUpdateExitEvents = (events: QueryFilterEvent[]) => {
    criteriaManager.updateCensoringCriteria(events)
  }

  const handleAddCriteriaGroup = (groupData: Partial<QueryFilterGroup>) => {
    criteriaManager.addCriteriaGroup(groupData)
  }

  const handleUpdateCriteriaGroup = (index: number, groupData: QueryFilterGroup) => {
    criteriaManager.updateCriteriaGroup(index, groupData)
  }

  const handleRemoveCriteriaGroup = (index: number) => {
    criteriaManager.removeCriteriaGroup(index)
    console.log('Criteria group removed:', index)
  }

  // Utility functions
  const getAllFilters = () => {
    try {
      return criteriaManager.toJSON()
    } catch (error: unknown) {
      console.error('Error in getAllFilters:', error)
      console.error(
        'Error details:',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      )
      return { inclusionCriteria: { criteria: [] }, entryEvents: {} }
    }
  }

  const convertToAtlasFormat = () => {
    try {
      return criteriaManager.convertToAtlasFormat()
    } catch (error: unknown) {
      console.error('Error in convertToAtlasFormat:', error)
      console.error(
        'Error details:',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      )
      return { ConceptSets: [], PrimaryCriteria: { CriteriaList: [] }, InclusionRules: [] }
    }
  }

  const clearFilters = () => {
    try {
      // eslint-disable-next-line no-undef
      if (confirm('Are you sure you want to clear all filters?')) {
        criteriaManager.clearAllCriteria()
        clearConceptSets()
      }
    } catch (error: unknown) {
      console.error('Error in clearFilters:', error)
      console.error(
        'Error details:',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      )
    }
  }

  const initializeComponent = () => {
    criteriaManager.clearAllCriteria()
    clearConceptSets()
  }
  // Function to find an event by ID across all sections of criteria manager
  const findEventById = (eventId: string): QueryFilterEvent | undefined => {
    // Search in entry events
    const entryEvents = criteriaManager.getPrimaryEvents()
    let foundEvent = entryEvents.events.find(e => e.id === eventId)
    if (foundEvent) {
      return foundEvent
    }

    // Also search nested events within primary events attributes
    for (const event of entryEvents.events) {
      if (event.attributes) {
        for (const attribute of event.attributes) {
          if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
            const nestedEvent = attribute.nestedCriteria.events.find(ne => ne.id === eventId)
            if (nestedEvent) {
              return nestedEvent
            }
          }
        }
      }
    }

    // Search in exit events (censoring criteria)
    const exitEvents = criteriaManager.getCensoringCriteria()
    foundEvent = exitEvents.censoringCriteria.find(e => e.id === eventId)
    if (foundEvent) {
      return foundEvent
    }

    // Search in inclusion criteria groups
    const criteria = criteriaManager.getCriteria()
    for (const group of criteria.criteria) {
      for (const event of group.events) {
        // Now that we've fixed the types, group.events only contains QueryFilterEvent objects
        if (event.id === eventId) {
          return event
        }

        // Also search nested events within attributes
        if (event.attributes) {
          for (const attribute of event.attributes) {
            if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
              const nestedEvent = attribute.nestedCriteria.events.find(ne => ne.id === eventId)
              if (nestedEvent) {
                return nestedEvent
              }
            }
          }
        }
      }
    }

    return undefined
  }

  // Helper function to load concept set details for Atlas conversion
  const loadConceptSetDetailsForEvent = async (event: QueryFilterEvent, conceptSet: ConceptSetItemDisplay) => {
    try {
      const conceptSetDetails = await loadSingleConceptSetDetails(conceptSet, getDatasetId())

      // Update the event with concept set details
      event.conceptSetDetails = conceptSetDetails
      event.conceptSetLoading = false

      // Try to update the event in primary events (for regular events)
      const primaryEvents = criteriaManager.getPrimaryEvents()
      const primaryEvent = primaryEvents?.events?.find(e => e.id === event.id)
      if (primaryEvent) {
        primaryEvent.conceptSetDetails = conceptSetDetails
        primaryEvent.conceptSetLoading = false
        primaryEvent.conceptSet = conceptSet.text || conceptSet.display_value || `${conceptSet.value}`
      } else {
        // Also check nested events within primary events
        let foundInPrimary = false
        if (primaryEvents?.events) {
          for (const primaryEvent of primaryEvents.events) {
            if (primaryEvent.attributes) {
              for (const attribute of primaryEvent.attributes) {
                if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
                  const nestedEvent = attribute.nestedCriteria.events.find(ne => ne.id === event.id)
                  if (nestedEvent) {
                    nestedEvent.conceptSetDetails = conceptSetDetails
                    nestedEvent.conceptSetLoading = false
                    // Only update conceptSet name if the event actually has a conceptSetId
                    if (nestedEvent.conceptSetId) {
                      nestedEvent.conceptSet = conceptSet.text || conceptSet.display_value || `${conceptSet.value}`
                    }
                    foundInPrimary = true
                    break
                  }
                }
              }
              if (foundInPrimary) break
            }
          }
        }

        if (!foundInPrimary) {
          // Try to find the event in inclusion criteria groups (including nested)
          const criteria = criteriaManager.getCriteria()
          let found = false

          for (const group of criteria.criteria) {
            // Check regular events in this group
            const regularEvent = group.events.find(e => e.id === event.id)
            if (regularEvent) {
              regularEvent.conceptSetDetails = conceptSetDetails
              regularEvent.conceptSetLoading = false
              regularEvent.conceptSet = conceptSet.text || conceptSet.display_value || `${conceptSet.value}`
              found = true
              break
            }

            // Check nested events in this group
            for (const groupEvent of group.events) {
              if (groupEvent.attributes) {
                for (const attribute of groupEvent.attributes) {
                  if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
                    const nestedEvent = attribute.nestedCriteria.events.find(ne => ne.id === event.id)
                    if (nestedEvent) {
                      nestedEvent.conceptSetDetails = conceptSetDetails
                      nestedEvent.conceptSetLoading = false
                      nestedEvent.conceptSet = conceptSet.text || conceptSet.display_value || `${conceptSet.value}`
                      found = true
                      break
                    }
                  }
                }
                if (found) break
              }
            }
            if (found) break
          }
        }
      }
    } catch (error) {
      console.error('Failed to load concept set details:', error)
      event.conceptSetLoading = false
    }
  }

  const updateEventConceptSet = (eventId: string, conceptSet: ConceptSetItemDisplay) => {
    const criteria = criteriaManager.getCriteria()
    // Check primary entry events first
    const primaryEvents = criteriaManager.getPrimaryEvents()
    if (primaryEvents?.events) {
      const event = primaryEvents.events.find(event => event.id === eventId)
      if (event) {
        // For events, use Vue's reactive assignment to ensure updates are detected
        Object.assign(event, {
          ...event,
          conceptSetId: conceptSet.value.toString(),
          selectedConceptSet: {
            value: Number(conceptSet.value),
            text: conceptSet.text || '',
            display_value: conceptSet.display_value || '',
            conceptIds: conceptSet.conceptIds || [],
            concepts: [], // Start with empty concepts array
            shared: false,
            userName: '',
            createdDate: new Date().toISOString(),
            modifiedDate: new Date().toISOString(),
          },
        })
        // Load concept set details for Atlas conversion
        loadConceptSetDetailsForEvent(event, conceptSet)
        return
      }

      // Also check nested events within primary events attributes
      for (const event of primaryEvents.events) {
        if (event.attributes) {
          for (const attribute of event.attributes) {
            if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
              const nestedEvent = attribute.nestedCriteria.events.find(ne => ne.id === eventId)
              if (nestedEvent) {
                // Direct assignment since nestedEvent is already reactive
                nestedEvent.conceptSetId = conceptSet.value.toString()
                nestedEvent.selectedConceptSet = {
                  value: Number(conceptSet.value),
                  text: conceptSet.text || '',
                  display_value: conceptSet.display_value || '',
                  conceptIds: conceptSet.conceptIds || [],
                  concepts: [], // Start with empty concepts array
                  shared: false,
                  userName: '',
                  createdDate: new Date().toISOString(),
                  modifiedDate: new Date().toISOString(),
                }
                nestedEvent.conceptSet = conceptSet.text || conceptSet.display_value || `${conceptSet.value}`

                // Load concept set details for Atlas conversion
                loadConceptSetDetailsForEvent(nestedEvent, conceptSet)
                return
              }
            }
          }
        }
      }
    }

    // Check inclusion criteria groups
    for (const group of criteria.criteria) {
      const event = group.events.find(event => event.id === eventId)
      if (event) {
        // For events, store the concept set ID as a string
        event.conceptSetId = conceptSet.value.toString()
        // Store a minimal concept set reference
        event.selectedConceptSet = {
          value: Number(conceptSet.value),
          text: conceptSet.text || '',
          display_value: conceptSet.display_value || '',
          conceptIds: conceptSet.conceptIds || [],
          concepts: [], // Start with empty concepts array
          shared: false,
          userName: '',
          createdDate: new Date().toISOString(),
          modifiedDate: new Date().toISOString(),
        }
        // Load concept set details for Atlas conversion
        loadConceptSetDetailsForEvent(event, conceptSet)
        return
      }

      // Check nested criteria within attributes
      for (const event of group.events) {
        if (event.attributes) {
          for (const attribute of event.attributes) {
            if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
              const nestedEvent = attribute.nestedCriteria.events.find(ne => ne.id === eventId)
              if (nestedEvent) {
                // For nested events, store the concept set ID as a string
                nestedEvent.conceptSetId = conceptSet.value.toString()
                // Store a minimal concept set reference
                nestedEvent.selectedConceptSet = {
                  value: Number(conceptSet.value),
                  text: conceptSet.text || '',
                  display_value: conceptSet.display_value || '',
                  conceptIds: conceptSet.conceptIds || [],
                  concepts: [], // Start with empty concepts array
                  shared: false,
                  userName: '',
                  createdDate: new Date().toISOString(),
                  modifiedDate: new Date().toISOString(),
                }
                // Load concept set details for Atlas conversion
                loadConceptSetDetailsForEvent(nestedEvent, conceptSet)
                return
              }
            }
          }
        }
      }
    }
  }

  return {
    // Core criteria manager
    criteriaManager,

    // Computed properties
    primaryEventsData,
    criteriaData,
    exitCriteriaData,
    conceptSetsFromCriteria,

    // Event handlers
    handleCriteriaUpdated,
    handleUpdateQualifyingLimit,
    handleUpdatePrimaryCriteriaLimit,
    handleUpdateExitStrategy,
    handleUpdateEntryDays,
    handleUpdateFixedDuration,
    handleUpdateContDrugSettings,
    handleUpdatePrimaryEvents,
    handleUpdateExitEvents,
    handleAddCriteriaGroup,
    handleUpdateCriteriaGroup,
    handleRemoveCriteriaGroup,

    // Utility functions
    getAllFilters,
    convertToAtlasFormat,
    clearFilters,
    initializeComponent,
    findEventById,
    loadConceptSetDetailsForEvent,
    updateEventConceptSet,
  }
}
