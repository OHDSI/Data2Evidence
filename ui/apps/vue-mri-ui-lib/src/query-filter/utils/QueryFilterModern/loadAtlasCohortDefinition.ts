import {
  AtlasBookmark,
  AtlasCohortDefinition,
  CriteriaGroup,
  CriteriaListItem,
  ConceptSet,
} from '@/query-filter/types/AtlasTypes'
import {
  ConceptSetDomainValues,
  ConceptSetItemDisplay,
  CreateConceptSetRequest,
} from '@/query-filter/types/ConceptSetTypes'
import { ComputedRef, Reactive, Ref } from 'vue'
import { loadConceptSets } from './loadConceptSets'
import {
  createConceptSet,
  loadConceptSetDetails as apiLoadConceptSetDetails,
} from '../../services/ConceptSetApiService'
import { QueryFilterCriteriaManager } from '@/query-filter/models/QueryFilterModel'
import { CriteriaConfigLoader } from '../CriteriaConfigLoader'
import { convertAtlasToFilters, hasCodesetId } from '../AtlasConverter'
import { QueryFilterEvent } from '@/query-filter/types/QueryFilterTypes'

const sanitizeConceptSetName = (name: string): string => {
  // Only allow letters, numbers and spaces, replace anything else with empty string
  return name.replace(/[^a-zA-Z0-9\s]/g, '').trim()
}

const updateCodesetIdReferences = (atlasExpression: AtlasCohortDefinition, idMapping: Record<number, number>) => {
  // Update the ConceptSets array IDs first - this is crucial for converter lookup
  if (atlasExpression.ConceptSets && Array.isArray(atlasExpression.ConceptSets)) {
    atlasExpression.ConceptSets.forEach(conceptSet => {
      const originalId = conceptSet.id
      const newId = idMapping[originalId]

      if (newId !== undefined && newId !== originalId) {
        conceptSet.id = newId
      }
    })
  }

  // Update CodesetId references in PrimaryCriteria
  if (atlasExpression.PrimaryCriteria?.CriteriaList) {
    atlasExpression.PrimaryCriteria.CriteriaList.forEach(criteriaItem => {
      if (criteriaItem && typeof criteriaItem === 'object') {
        Object.keys(criteriaItem).forEach(key => {
          // Type guard using keyof to get valid keys from the type
          if (!((key as keyof CriteriaListItem) in criteriaItem)) return

          const criteriaValue = criteriaItem[key as keyof CriteriaListItem]
          if (
            criteriaValue &&
            typeof criteriaValue === 'object' &&
            'CodesetId' in criteriaValue &&
            typeof criteriaValue.CodesetId === 'number'
          ) {
            const originalCodesetId = criteriaValue.CodesetId
            const newId = idMapping[originalCodesetId]

            if (newId !== undefined && newId !== originalCodesetId) {
              criteriaValue.CodesetId = newId
            }
          }
        })
      }
    })
  }

  // Update CodesetId references in InclusionRules
  if (atlasExpression.InclusionRules) {
    atlasExpression.InclusionRules.forEach(rule => {
      rule.expression?.CriteriaList?.forEach(criteriaItem => {
        if (criteriaItem.Criteria) {
          Object.keys(criteriaItem.Criteria).forEach(key => {
            const criteriaValue = criteriaItem.Criteria[key]
            if (criteriaValue && typeof criteriaValue === 'object' && typeof criteriaValue.CodesetId === 'number') {
              const originalCodesetId = criteriaValue.CodesetId
              const newId = idMapping[originalCodesetId]

              if (newId !== undefined && newId !== originalCodesetId) {
                criteriaValue.CodesetId = newId
              }
            }
          })
        }
      })
    })
  }

  // Update CodesetId references in CensoringCriteria
  if (atlasExpression.CensoringCriteria) {
    atlasExpression.CensoringCriteria.forEach(criteriaItem => {
      if (criteriaItem && typeof criteriaItem === 'object') {
        Object.keys(criteriaItem).forEach(key => {
          // Type guard using keyof to get valid keys from the type
          if (!((key as keyof CriteriaListItem) in criteriaItem)) return

          const criteriaValue = criteriaItem[key]
          if (
            criteriaValue &&
            typeof criteriaValue === 'object' &&
            'CodesetId' in criteriaValue &&
            typeof criteriaValue.CodesetId === 'number'
          ) {
            const originalCodesetId = criteriaValue.CodesetId
            const newId = idMapping[originalCodesetId]

            if (newId !== undefined && newId !== originalCodesetId) {
              criteriaValue.CodesetId = newId
            }
          }
        })
      }
    })
  }
}

export const loadAtlasCohortDefinition = async (
  atlasJson: AtlasBookmark,
  isLoading: Ref<boolean, boolean>,
  allConceptSets: Ref<ConceptSetItemDisplay[]>,
  getDatasetId: () => string | null,
  conceptSetDomainValues: Ref<ConceptSetDomainValues>,
  criteriaManager: Reactive<QueryFilterCriteriaManager>,
  conceptSetsFromCriteria: ComputedRef<ConceptSetItemDisplay[]>,
  nextTick: () => Promise<void>,
  selectedConceptSets: Ref<ConceptSetItemDisplay[]>
) => {
  const loadConceptSetDetailsForAllEvents = async () => {
    console.log('Loading concept set details for all events...')
    const criteria = criteriaManager.getCriteria()

    // Collect all unique concept sets that need details loaded
    const conceptSetsToLoad: ConceptSetItemDisplay[] = []
    const eventsByConceptSetId = new Map<string, QueryFilterEvent[]>()

    for (const group of criteria.criteria) {
      for (const event of group.events) {
        if (event.conceptSetId) {
          // Find the concept set in allConceptSets
          let conceptSet = allConceptSets.value.find(cs => cs.value.toString() === event.conceptSetId!.toString())

          if (!conceptSet) {
            console.warn(`Concept set ${event.conceptSetId} not found in allConceptSets for event ${event.id}`)
            continue
          }

          // Set selectedConceptSet if not already set
          if (!event.selectedConceptSet) {
            // Convert ConceptSetItem to SelectedConceptSet
            event.selectedConceptSet = {
              value: parseInt(conceptSet.value) || 0,
              text: conceptSet.text || '',
              display_value: conceptSet.display_value || conceptSet.text || '',
              conceptIds: conceptSet.conceptIds || [],
              concepts: (conceptSet.concepts || []).map(concept => ({
                id: concept.id || concept.concept_id || 0,
                useMapped: concept.useMapped || false,
                isExcluded: concept.isExcluded || false,
                useDescendants: concept.useDescendants || false,
              })),
              shared: false,
              userName: 'system',
              createdDate: new Date().toISOString(),
              modifiedDate: new Date().toISOString(),
            }
            console.log(`Linked concept set ${conceptSet.text} to event ${event.id}`)
          }

          // Check if we need to load details for this concept set
          if (!event.conceptSetDetails || event.conceptSetDetails.length === 0) {
            event.conceptSetLoading = true

            // Add to batch loading list
            if (!conceptSetsToLoad.some(cs => cs.value === conceptSet.value)) {
              conceptSetsToLoad.push(conceptSet)
            }

            // Track which events need this concept set
            if (!eventsByConceptSetId.has(conceptSet.value)) {
              eventsByConceptSetId.set(conceptSet.value, [])
            }
            eventsByConceptSetId.get(conceptSet.value)!.push(event)
          }
        }
      }
    }

    console.log(
      `Batch loading details for ${conceptSetsToLoad.length} concept sets:`,
      conceptSetsToLoad.map(cs => `${cs.text} (ID: ${cs.value})`)
    )

    try {
      const datasetId = getDatasetId()
      if (!datasetId) {
        console.error('Missing datasetId for batch concept set details loading')
        return
      }

      // Process concept sets in batches of 10
      const batchSize = 10
      for (let i = 0; i < conceptSetsToLoad.length; i += batchSize) {
        const batch = conceptSetsToLoad.slice(i, i + batchSize)
        console.log(
          `Loading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(conceptSetsToLoad.length / batchSize)}:`,
          batch.map(cs => cs.text)
        )

        // Load details for this batch
        try {
          const batchResults = await apiLoadConceptSetDetails(batch, datasetId)

          // Apply results to all events that need each concept set
          for (const [conceptSetId, conceptSetDetailsArray] of Object.entries(batchResults || {})) {
            const eventsForThisConceptSet = eventsByConceptSetId.get(conceptSetId) || []

            // Ensure conceptSetDetailsArray is properly typed
            const typedConceptSetDetails = Array.isArray(conceptSetDetailsArray) ? conceptSetDetailsArray : []

            for (const event of eventsForThisConceptSet) {
              event.conceptSetDetails = typedConceptSetDetails
              event.conceptSetLoading = false
              console.log(
                `Loaded ${typedConceptSetDetails.length} concept details for ${event.conceptSet} (event ${event.id})`
              )

              // Debug: Log first concept detail to verify format
              if (typedConceptSetDetails.length > 0) {
                console.log('Sample concept detail:', typedConceptSetDetails[0])
              }
            }
          }
        } catch (batchError) {
          console.error(`Error loading batch ${Math.floor(i / batchSize) + 1}:`, batchError)
          // Mark all events in this batch as failed
          for (const conceptSetId of batch.map(cs => cs.value)) {
            const eventsForThisConceptSet = eventsByConceptSetId.get(conceptSetId) || []
            for (const event of eventsForThisConceptSet) {
              event.conceptSetLoading = false
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in batch loading concept set details:', error)

      // Clear loading state for all events
      for (const events of eventsByConceptSetId.values()) {
        for (const event of events) {
          event.conceptSetLoading = false
        }
      }
    }

    // Force reactivity update and trigger watcher
    await nextTick()

    // Manually trigger selectedConceptSets update to ensure UI synchronization
    const currentConceptSets = conceptSetsFromCriteria.value
    if (currentConceptSets.length > 0) {
      selectedConceptSets.value = [...currentConceptSets]
      console.log(
        `Updated selectedConceptSets with ${currentConceptSets.length} concept sets:`,
        currentConceptSets.map(cs => `${cs.text} (ID: ${cs.value})`)
      )
    }

    console.log('Finished batch loading concept set details for all events')
  }

  const handleConceptSetFromAtlas = async (
    atlasConceptSet: ConceptSet & { conceptSetId?: number }
  ): Promise<ConceptSetItemDisplay | null> => {
    const datasetId = getDatasetId()
    if (!datasetId) {
      console.error('Missing datasetId for concept set handling')
      return null
    }

    // Check if concept set already exists by conceptSetId (system ID)
    if (atlasConceptSet.conceptSetId) {
      const existingConceptSet = allConceptSets.value.find(cs => {
        return cs.value.toString().trim() === atlasConceptSet.conceptSetId!.toString().trim()
      })
      if (existingConceptSet) {
        console.log(
          `Found existing concept set by conceptSetId: ${existingConceptSet.text} (ID: ${existingConceptSet.value})`
        )
        return existingConceptSet
      }
    }

    // Create new concept set if it doesn't exist
    if (atlasConceptSet.expression?.items && atlasConceptSet.name) {
      try {
        const sanitizedName = sanitizeConceptSetName(atlasConceptSet.name)
        console.log(`Creating new concept set: ${sanitizedName} (original: ${atlasConceptSet.name})`)

        // Extract concepts from Atlas format
        const concepts = atlasConceptSet.expression.items
          .map(item => ({
            id: item.concept.CONCEPT_ID,
            useDescendants: item.includeDescendants !== false, // Default to true
            useMapped: item.includeMapped !== false, // Default to true
            isExcluded: item.isExcluded === true, // Default to false
          }))
          .filter(concept => concept.id) // Only include items with valid concept IDs

        if (concepts.length === 0) {
          console.error(`No valid concepts found in Atlas concept set: ${sanitizedName}`)
          return null
        }

        const createRequest: CreateConceptSetRequest = {
          name: sanitizedName,
          concepts,
          shared: false, // Default to not shared
          userName: 'system', // Default userName
        }

        // Create the concept set via API
        const newConceptSetId = await createConceptSet(createRequest, datasetId)
        console.log(`Created concept set with ID: ${newConceptSetId}`)

        // Create a temporary concept set item to return immediately
        // The actual reload will happen at the end of all concept set processing
        const tempConceptSet: ConceptSetItemDisplay = {
          value: newConceptSetId.toString(),
          text: sanitizedName,
          display_value: sanitizedName,
          conceptIds: concepts.map(c => c.id),
          concepts: concepts,
        }

        console.log(`Successfully created concept set: ${tempConceptSet.text} (System ID: ${newConceptSetId})`)
        return tempConceptSet
      } catch (error) {
        console.error(`Error creating concept set ${atlasConceptSet.name}:`, error)
        return null
      }
    }

    console.error(
      `Cannot handle concept set: missing required data (id: ${atlasConceptSet.id}, name: ${
        atlasConceptSet.name
      }, items: ${atlasConceptSet.expression?.items?.length || 0})`
    )
    return null
  }

  try {
    isLoading.value = true
    // Ensure concept sets are loaded before processing Atlas JSON
    if (allConceptSets.value.length === 0) {
      await loadConceptSets(getDatasetId, allConceptSets, conceptSetDomainValues)
    }
    const atlasExpression: AtlasCohortDefinition =
      typeof atlasJson.expression === 'string' ? JSON.parse(atlasJson.expression) : atlasJson.expression

    // Extract concept set IDs from criteria even if ConceptSets array is empty
    const extractConceptSetIds = (expression: AtlasCohortDefinition): Set<number> => {
      const conceptSetIds = new Set<number>()

      // Helper function to extract CodesetId from criteria and handle nested CorrelatedCriteria
      const extractFromCriteria = (criteriaItem: CriteriaGroup | CriteriaListItem) => {
        const isCriteriaListItem = (value: CriteriaGroup | CriteriaListItem): value is CriteriaGroup => {
          return 'Criteria' in value
        }
        const criteria = isCriteriaListItem(criteriaItem) ? criteriaItem.Criteria : criteriaItem
        const criteriaObjs = Object.values(criteria) as CriteriaListItem[keyof CriteriaListItem]
        const criteriaKeys = Object.keys(criteriaObjs) as (keyof CriteriaListItem)[]

        criteriaKeys.forEach(key => {
          const criteriaObj = criteria[key]
          if (hasCodesetId(criteriaObj)) {
            conceptSetIds.add(criteriaObj.CodesetId)
          }

          // Handle nested CorrelatedCriteria recursively
          if (criteriaObj && typeof criteriaObj === 'object' && 'CorrelatedCriteria' in criteriaObj) {
            const correlated = criteriaObj.CorrelatedCriteria as { CriteriaList?: CriteriaGroup[] }
            correlated.CriteriaList?.forEach((nestedItem: CriteriaGroup) => {
              extractFromCriteria(nestedItem)
            })
          }
        })
      }

      // Extract from InclusionRules
      expression.InclusionRules?.forEach(rule => {
        rule.expression?.CriteriaList?.forEach(criteriaItem => {
          extractFromCriteria(criteriaItem)
        })
      })

      // Extract from PrimaryCriteria
      expression.PrimaryCriteria?.CriteriaList?.forEach(criteriaItem => {
        extractFromCriteria(criteriaItem)
      })

      // Extract from CensoringCriteria
      expression.CensoringCriteria?.forEach(criteriaItem => {
        extractFromCriteria(criteriaItem)
      })

      return conceptSetIds
    }

    // Get concept set IDs referenced in the Atlas JSON
    // If we have ConceptSets with conceptSetId, use those instead of CodesetIds from criteria
    let referencedConceptSetIds: Set<number>
    if (atlasExpression.ConceptSets && Array.isArray(atlasExpression.ConceptSets)) {
      referencedConceptSetIds = new Set<number>()
      atlasExpression.ConceptSets.forEach(cs => {
        if (cs.conceptSetId) {
          referencedConceptSetIds.add(cs.conceptSetId)
        }
      })
    } else {
      referencedConceptSetIds = extractConceptSetIds(atlasExpression)
    }

    // Check if referenced concept sets exist locally
    for (const conceptSetId of referencedConceptSetIds) {
      const existingConceptSet = allConceptSets.value.find(cs => cs.value === conceptSetId.toString())
      if (existingConceptSet) {
        console.log(`Found existing concept set ${conceptSetId}: ${existingConceptSet.text}`)
      } else {
        console.error(
          `Referenced concept set ${conceptSetId} not found locally and no ConceptSets definition provided in Atlas JSON`
        )
      }
    }

    // Handle concept sets from ConceptSets array (if provided)
    if (atlasExpression.ConceptSets && Array.isArray(atlasExpression.ConceptSets)) {
      console.log('Processing Atlas concept sets:', atlasExpression.ConceptSets.length)

      const handledConceptSets: ConceptSetItemDisplay[] = []
      const idMapping: Record<number, number> = {} // originalId → sequentialId
      let conceptSetsUpdated = false

      for (let index = 0; index < atlasExpression.ConceptSets.length; index++) {
        const atlasConceptSet = atlasExpression.ConceptSets[index]
        if (!atlasConceptSet) continue

        try {
          const originalId = atlasConceptSet.id
          const handledConceptSet = await handleConceptSetFromAtlas(atlasConceptSet)
          if (!handledConceptSet) {
            console.error(`Failed to handle concept set: ${atlasConceptSet.name}`)
          } else {
            console.log(`Successfully handled concept set: ${handledConceptSet.text}`)
            handledConceptSets.push(handledConceptSet)

            // Use sequential ID starting from 0 for Atlas JSON
            const sequentialId = index
            const systemConceptSetId = parseInt(handledConceptSet.value)

            // Update Atlas concept set with system concept set ID (ID will be updated later by updateCodesetIdReferences)
            atlasConceptSet.conceptSetId = systemConceptSetId

            // Track the ID mapping (original → sequential)
            idMapping[originalId] = sequentialId
            console.log(`Atlas ID mapping: ${originalId} → ${sequentialId} (System ID: ${systemConceptSetId})`)

            // Add new concept sets to allConceptSets immediately for the converter
            if (!allConceptSets.value.find(cs => cs.value.toString() === handledConceptSet.value.toString())) {
              allConceptSets.value.push(handledConceptSet)
              conceptSetsUpdated = true
            }
          }
        } catch (error) {
          console.error(`Error handling concept set ${atlasConceptSet.name}:`, error)
        }
      }

      // If we created any new concept sets, reload to get complete data from API
      if (conceptSetsUpdated) {
        console.log('Reloading concept sets after updates to get complete data...')
        await loadConceptSets(getDatasetId, allConceptSets, conceptSetDomainValues)

        // Update CodesetId references in criteria to match the new concept set IDs
        console.log('Updating CodesetId references in Atlas JSON...')
        console.log('ID mapping to apply:', idMapping)
        updateCodesetIdReferences(atlasExpression, idMapping)
      }
    } else {
      console.log('No ConceptSets array found in Atlas JSON - will use existing local concept sets')
    }

    // Clear existing criteria
    criteriaManager.clearAllCriteria()

    // Convert Atlas JSON to hierarchical criteria with updated concept sets
    console.log(
      'Available concept sets for conversion:',
      allConceptSets.value.map(cs => `${cs.text} (ID: ${cs.value})`)
    )
    console.log(
      'Atlas ConceptSets for conversion:',
      atlasExpression.ConceptSets?.map(cs => `${cs.name} (ID: ${cs.id})`)
    )
    const configLoader = new CriteriaConfigLoader()

    const tempManager = convertAtlasToFilters(atlasExpression, allConceptSets.value, configLoader)

    // Copy the criteria to our reactive manager
    criteriaManager.setData(tempManager.getData())

    // Force reactivity update
    await nextTick()

    // Load concept set details for all events with concept sets
    await loadConceptSetDetailsForAllEvents()
    isLoading.value = false
  } catch (error) {
    console.error('Error loading Atlas cohort definition:', error)
    isLoading.value = false
    throw error
  }
}

