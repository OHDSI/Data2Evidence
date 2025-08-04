<script lang="ts">
export default {
  name: 'QueryFilterModern',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, getCurrentInstance, watch, nextTick } from 'vue'
import QueryFilterCriteria from './QueryFilterCriteria.vue'
import {
  QueryFilterCriteriaManager,
  QueryFilterEvent,
  QueryFilterGroup,
  type StoredConceptItem,
} from '../models/QueryFilterModel'
import { convertAtlasToFilters } from '../utils/AtlasConverter'
import QueryFilterTagInputAdapter from '../../lib/ui/QueryFilterTagInputAdapter.vue'
import type {
  ConceptSetItem,
  ConceptSetDomainValues,
  TagInputModel,
  ConceptSetAction,
  ConceptSetDetails,
  CreateConceptSetRequest,
} from '../types/ConceptSetTypes'
import type {
  AtlasCohortDefinition,
  ConceptSet,
  CriteriaGroup,
  CriteriaListItem,
} from '../models/AtlasCohortDefinition'
import {
  loadConceptSets as apiLoadConceptSets,
  loadConceptSetDetails as apiLoadConceptSetDetails,
  createConceptSet,
} from '../services/ConceptSetApiService'
import { filterConceptSets, getTagInputTexts, createDefaultConceptSetDomainValues } from '../utils/ConceptSetHelpers'
import QueryFilterEntryExit from './QueryFilterEntryExit.vue'
import { getPortalAPI } from '../../utils/PortalUtils'
import ButtonMaterial from './ButtonMaterial.vue'
import SplashScreen from '@/components/SplashScreen.vue'
import messageBox from '../../components/MessageBox.vue'
import appButton from '../../lib/ui/app-button.vue'
import appCheckbox from '../../lib/ui/app-checkbox.vue'

// Interface for concept selection from terminology modal (matches portal's FhirValueSetExpansionContainsWithExt)
interface SelectedConcept {
  conceptId: number
  display: string
  domainId: string
  system?: string | undefined
  conceptClassId?: string | undefined
  standardConcept?: string | undefined
  concept?: string | undefined
  code?: string | undefined
  validStartDate?: string | undefined
  validEndDate?: string | undefined
  validity?: string | undefined
  useDescendants?: boolean | undefined
  useMapped?: boolean | undefined
  isExcluded?: boolean | undefined
  score?: number | undefined
  // Backward compatibility field (our custom addition)
  conceptName?: string | undefined
}

// Interface for close callback values from terminology modal
interface TerminologyCloseValues {
  currentConceptSet?: { id: string; name: string }
  selectedConcepts?: SelectedConcept[]
}

// Interface for terminology modal event properties
interface TerminologyEventProps {
  selectedDatasetId: string
  selectedConceptSetId?: string | number | undefined
  mode: 'CONCEPT_SET' | 'CONCEPT_MULTI_SELECT'
  defaultFilters: Array<{ id: string; value: string[] }>
  initialSelectedConcepts?: SelectedConcept[] // For pre-populating CONCEPT_MULTI_SELECT mode
  onClose?: (onCloseValues?: TerminologyCloseValues | undefined) => void | Promise<void>
  onMultiConceptSelect?: (concepts: SelectedConcept[]) => void
}

// Use the hierarchical criteria manager
const criteriaManager = reactive(new QueryFilterCriteriaManager())
const instance = getCurrentInstance()
const store = instance?.appContext.config.globalProperties['$store']

const showDebug = ref(false)

const showSaveDialog = ref(false)
const cohortName = ref('')
const shareBookmark = ref(false)
const isInvalidName = ref(false)
const maxLength = 40

const isLoading = ref(false)

const tagInputModel = computed<TagInputModel>(() => {
  try {
    return {
      id: 'concept-set-test',
      props: {
        type: 'conceptSet',
        value: selectedConceptSetValues.value,
        attributePath: 'condition_occurrence.concept_id',
        domainFilter: 'Condition',
        standardConceptCodeFilter: 'Standard',
      },
    }
  } catch (error: unknown) {
    console.error('Error in tagInputModel computed:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    )
    return {
      id: 'concept-set-test',
      props: {
        type: 'conceptSet',
        value: [],
        attributePath: 'condition_occurrence.concept_id',
        domainFilter: 'Condition',
        standardConceptCodeFilter: 'Standard',
      },
    }
  }
})

const selectedConceptSets = ref<ConceptSetItem[]>([])

const conceptSetsFromCriteria = computed(() => {
  const conceptSets: ConceptSetItem[] = []
  const seenIds = new Set<string>()

  const criteria = criteriaManager.getCriteria()
  criteria.criteria.forEach(group => {
    group.events.forEach(event => {
      if (event.conceptSetId && !seenIds.has(event.conceptSetId)) {
        const foundConceptSet = allConceptSets.value.find(cs => cs.value.toString() === event.conceptSetId!.toString())
        if (foundConceptSet) {
          conceptSets.push(foundConceptSet)
          seenIds.add(event.conceptSetId)
        } else if (event.selectedConceptSet) {
          console.warn(`Concept set ${event.conceptSetId} not found in allConceptSets, using fallback`)
          // Convert SelectedConceptSet to ConceptSetItem
          const convertedConceptSet: ConceptSetItem = {
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

const conceptSetDetails = ref<ConceptSetDetails>({})
const loadingConceptDetails = ref(false)

const tagInputTexts = getTagInputTexts()

const allConceptSets = ref<ConceptSetItem[]>([])
const conceptSetDomainValues = ref<ConceptSetDomainValues>(createDefaultConceptSetDomainValues())

const datasetId = computed(() => {
  const storeDatasetId = store?.state?.selectedDataset?.id
  if (storeDatasetId) {
    return storeDatasetId
  }

  const portalAPI = getPortalAPI()
  if (portalAPI?.studyId) {
    return portalAPI.studyId
  }

  return null
})

const getDatasetId = (): string | null => {
  return datasetId.value
}

const loadConceptSets = async () => {
  const currentDatasetId = getDatasetId()

  if (!currentDatasetId) {
    console.warn('Cannot load concept sets: Dataset ID not available from store or portalAPI')
    allConceptSets.value = []
    conceptSetDomainValues.value = {
      values: [],
      isLoading: false,
      loadedStatus: 'NO_RESULTS',
    }
    return
  }

  conceptSetDomainValues.value.isLoading = true

  try {
    const result = await apiLoadConceptSets(currentDatasetId)
    allConceptSets.value = result.values
    conceptSetDomainValues.value = result
  } catch (error) {
    console.error('Error loading concept sets:', error)
    allConceptSets.value = []
    conceptSetDomainValues.value = {
      values: [],
      isLoading: false,
      loadedStatus: 'NO_RESULTS',
    }
  }
}

const loadConceptSetDetails = async (selectedConceptSets: ConceptSetItem[]) => {
  if (selectedConceptSets.length === 0) {
    conceptSetDetails.value = {}
    return
  }

  const currentDatasetId = getDatasetId()
  if (!currentDatasetId) {
    console.warn('Cannot load concept set details: Dataset ID not available from store or portalAPI')
    conceptSetDetails.value = {}
    return
  }

  loadingConceptDetails.value = true

  try {
    const result = await apiLoadConceptSetDetails(selectedConceptSets, currentDatasetId)
    conceptSetDetails.value = result
  } catch (error) {
    console.error('Error loading concept set details:', error)
    conceptSetDetails.value = {}
  } finally {
    loadingConceptDetails.value = false
  }
}

const filterConceptSetsLocal = (searchQuery: string) => {
  conceptSetDomainValues.value = filterConceptSets(allConceptSets.value, searchQuery)
}

const tagInputDomainValues = computed(() => {
  try {
    return conceptSetDomainValues.value
  } catch (error: unknown) {
    console.error('Error in tagInputDomainValues computed:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    )
    return { values: [], isLoading: false, loadedStatus: 'NO_RESULTS' }
  }
})

const selectedConceptSetValues = computed(() => {
  try {
    return selectedConceptSets.value
  } catch (error: unknown) {
    console.error('Error in selectedConceptSetValues computed:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    )
    return []
  }
})

const getText = (key: string, ...args: (string | number)[]) => {
  return store?.getters?.getText?.(key, ...args) || key
}

const hasExceededLength = computed(() => {
  return cohortName.value.length >= maxLength
})

const initializeComponent = () => {
  criteriaManager.clearAllCriteria()
  selectedConceptSets.value = []
}

watch(
  selectedConceptSets,
  async newSelection => {
    if (newSelection && newSelection.length > 0) {
      await loadConceptSetDetails(newSelection)
    } else {
      conceptSetDetails.value = {}
    }
  },
  { deep: true }
)

// Watch for changes in conceptSetsFromCriteria and sync with selectedConceptSets
watch(
  conceptSetsFromCriteria,
  newConceptSets => {
    // Only update if the conceptSetsFromCriteria has content and is different from selectedConceptSets
    if (newConceptSets.length > 0) {
      selectedConceptSets.value = [...newConceptSets]
    }
  },
  { deep: true }
)

onMounted(() => {
  console.log('QueryFilterModern component mounted')
  initializeComponent()
})

// Handle criteria updates from the new component hierarchy
const handleCriteriaUpdated = (updatedCriteriaManager: QueryFilterCriteriaManager) => {
  // The criteria manager is reactive, so updates are automatic
  console.log('Criteria updated:', updatedCriteriaManager.toJSON())
}

// Handle qualifying events limit updates
const handleUpdateQualifyingLimit = (limit: 'ALL' | 'EARLIEST' | 'LATEST') => {
  criteriaManager.updateQualifyingEventsLimit(limit)
  console.log('Qualifying limit updated:', limit)
}

// Handle primary criteria limit updates
const handleUpdatePrimaryCriteriaLimit = (
  limit: 'ALL' | 'EARLIEST' | 'LATEST' | 'CONT_OBS' | 'FIXED' | 'CONT_DRUG'
) => {
  // Only handle the limits that are valid for primary criteria
  if (limit === 'ALL' || limit === 'EARLIEST' || limit === 'LATEST') {
    criteriaManager.updatePrimaryCriteriaLimit(limit)
    console.log('Primary criteria limit updated:', limit)
  }
}

// Handle exit strategy updates
const handleUpdateExitStrategy = (limit: 'ALL' | 'EARLIEST' | 'LATEST' | 'CONT_OBS' | 'FIXED' | 'CONT_DRUG') => {
  // Only handle the limits that are valid for exit strategy
  if (limit === 'CONT_OBS' || limit === 'FIXED' || limit === 'CONT_DRUG') {
    criteriaManager.updateEndStrategy(limit)
    console.log('Exit strategy updated:', limit)
  }
}

// Handle entry days updates
const handleUpdateEntryDays = (type: 'PRIOR' | 'POST', days: number) => {
  criteriaManager.updateEntryDays(type, days)
  console.log('Entry days updated:', days, 'Type:', type)
}

// Handle adding new criteria group
const handleAddCriteriaGroup = (groupData: Partial<QueryFilterGroup>) => {
  criteriaManager.addCriteriaGroup(groupData)
}

// Handle updating criteria group
const handleUpdateCriteriaGroup = (index: number, groupData: QueryFilterGroup) => {
  criteriaManager.updateCriteriaGroup(index, groupData)
}

// Handle removing criteria group
const handleRemoveCriteriaGroup = (index: number) => {
  criteriaManager.removeCriteriaGroup(index)
  console.log('Criteria group removed:', index)
}

// Note: handleCriteriaSelected removed - not needed in modern component

const applyFilters = () => {
  try {
    console.log('Applying filters:', getAllFilters())
    alert('Filters applied! Check console for configuration.')
  } catch (error: unknown) {
    console.error('Error in applyFilters:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    )
    alert('Error applying filters! Check console for details.')
  }
}

const clearFilters = () => {
  try {
    if (confirm('Are you sure you want to clear all filters?')) {
      criteriaManager.clearAllCriteria()
      selectedConceptSets.value = []
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

const exportFilters = () => {
  try {
    const config = JSON.stringify(getAllFilters(), null, 2)
    console.log('Exported configuration:', config)
  } catch (error: unknown) {
    console.error('Error in exportFilters:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    )
  }
}

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

type AtlasBookmark = {
  id: number
  name: string
  description: string
  expressionType: string
  expression: string
  createdBy: string
  createdDate: number
  modifiedBy: string
  modifiedDate: number
  tags: string[]
  hasWriteAccess: boolean
  hasReadAccess: boolean
}

const loadAtlasCohortDefinition = async (atlasJson: AtlasBookmark) => {
  try {
    console.log('Loading Atlas cohort definition:', atlasJson?.name || 'Unnamed cohort')
    console.log('Available concept sets:', allConceptSets.value.length)

    isLoading.value = true

    // Ensure concept sets are loaded before processing Atlas JSON
    if (allConceptSets.value.length === 0) {
      await loadConceptSets()
    }
    const atlasExpression: AtlasCohortDefinition =
      typeof atlasJson.expression === 'string' ? JSON.parse(atlasJson.expression) : atlasJson.expression

    // Extract concept set IDs from criteria even if ConceptSets array is empty
    const extractConceptSetIds = (expression: AtlasCohortDefinition): Set<number> => {
      const conceptSetIds = new Set<number>()

      // Helper function to extract CodesetId from criteria and handle nested CorrelatedCriteria
      const extractFromCriteria = (criteriaItem: CriteriaGroup | CriteriaListItem | Record<string, unknown>) => {
        const criteria = 'Criteria' in criteriaItem ? criteriaItem.Criteria : criteriaItem
        if (criteria && typeof criteria === 'object') {
          Object.values(criteria).forEach((criteriaObj: unknown) => {
            if (
              criteriaObj &&
              typeof criteriaObj === 'object' &&
              'CodesetId' in criteriaObj &&
              typeof criteriaObj.CodesetId === 'number'
            ) {
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

      const handledConceptSets: ConceptSetItem[] = []
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
        await loadConceptSets()

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
    const tempManager = convertAtlasToFilters(atlasExpression, allConceptSets.value)
    console.log('Converted Atlas JSON to tempManager:', tempManager)

    // Copy the criteria to our reactive manager
    criteriaManager.setData(tempManager.getData())

    console.log('Successfully loaded Atlas cohort definition into QueryFilterModern')

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

const loadConceptSetDetailsForAllEvents = async () => {
  console.log('Loading concept set details for all events...')
  const criteria = criteriaManager.getCriteria()

  // Collect all unique concept sets that need details loaded
  const conceptSetsToLoad: ConceptSetItem[] = []
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
              id: concept.id || concept.concept_id || concept.CONCEPT_ID || 0,
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

  if (conceptSetsToLoad.length === 0) {
    console.log('No concept sets need details loaded')
    return
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
            const criteriaValue = (criteriaItem.Criteria as any)[key]
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

const handleConceptSetFromAtlas = async (
  atlasConceptSet: ConceptSet & { conceptSetId?: number }
): Promise<ConceptSetItem | null> => {
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
          id: item.concept?.CONCEPT_ID,
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
      const tempConceptSet: ConceptSetItem = {
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

// Handle concept set updates
const handleConceptSetUpdate = (value: ConceptSetItem[]) => {
  try {
    console.log('handleConceptSetUpdate called with:', value)
    if (Array.isArray(value) && selectedConceptSets) {
      selectedConceptSets.value = [...value]
      console.log('Concept set updated (stored locally):', value)
    } else {
      console.warn('Invalid value passed to handleConceptSetUpdate:', value)
    }
  } catch (error: unknown) {
    console.error('Error in handleConceptSetUpdate:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    )
    if (selectedConceptSets && Array.isArray(value)) {
      selectedConceptSets.value = value
    }
  }
}

const handleSearchChange = (searchQuery: string) => {
  try {
    console.log('handleSearchChange called with:', searchQuery)
    filterConceptSetsLocal(searchQuery)
  } catch (error: unknown) {
    console.error('Error in handleSearchChange:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    )
  }
}

// Function to find an event by ID across all sections of criteria manager
const findEventById = (eventId: string): QueryFilterEvent | undefined => {
  // Search in entry events
  const entryEvents = criteriaManager.getPrimaryEvents()
  let foundEvent = entryEvents.events.find(e => e.id === eventId)
  if (foundEvent) return foundEvent

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
  if (foundEvent) return foundEvent

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

// Function to get existing concepts from an attribute for pre-populating the modal
const getExistingConceptsForAttribute = (targetEventId: string, targetAttributeId: string): SelectedConcept[] => {
  const targetEvent = findEventById(targetEventId)
  if (!targetEvent) {
    return []
  }

  const targetAttribute = targetEvent.attributes?.find(attr => attr.id === targetAttributeId)
  if (!targetAttribute) {
    return []
  }

  // Check if attribute has conceptItems (from previous CONCEPT_MULTI_SELECT)
  if ('conceptItems' in targetAttribute && (targetAttribute as any).conceptItems) {
    const storedItems = targetAttribute.conceptItems as StoredConceptItem[]
    return storedItems.map((item: StoredConceptItem) => ({
      conceptId: Number(item.conceptId || item.value),
      display: item.display_value || item.text || 'Unknown',
      domainId: item.domainId || 'Unknown',
      system: item.system,
      conceptClassId: item.conceptClassId,
      standardConcept: item.standardConcept,
      concept: item.concept || item.text,
      code: item.code,
      validStartDate: item.validStartDate,
      validEndDate: item.validEndDate,
      validity: item.validity,
      useDescendants: item.useDescendants || false,
      useMapped: item.useMapped || false,
      isExcluded: item.isExcluded || false,
      score: item.score,
    }))
  }

  // Fallback: check if attribute has a conceptSet with individual concepts
  if (
    'conceptSet' in targetAttribute &&
    targetAttribute.conceptSet &&
    typeof targetAttribute.conceptSet === 'object' &&
    'concepts' in targetAttribute.conceptSet &&
    Array.isArray(targetAttribute.conceptSet.concepts) &&
    targetAttribute.conceptSet.concepts.length > 0
  ) {
    const conceptSet = targetAttribute.conceptSet
    const concepts = targetAttribute.conceptSet.concepts
    return concepts
      .filter(concept => concept.id || concept.concept_id || concept.CONCEPT_ID) // Only include concepts with valid IDs
      .map(concept => ({
        conceptId: concept.id || concept.concept_id || concept.CONCEPT_ID || 0,
        display: conceptSet.display_value || conceptSet.text || 'Unknown',
        domainId: 'Unknown',
        system: undefined,
        conceptClassId: undefined,
        standardConcept: undefined,
        concept: conceptSet.text || 'Unknown',
        code: undefined,
        validStartDate: undefined,
        validEndDate: undefined,
        validity: undefined,
        useDescendants: concept.useDescendants || false,
        useMapped: concept.useMapped || false,
        isExcluded: concept.isExcluded || false,
        score: undefined,
      }))
  }

  return []
}

// Function to update a specific attribute with selected concepts
const updateAttributeWithConcepts = (
  targetEventId: string,
  targetAttributeId: string,
  conceptItems: StoredConceptItem[]
) => {
  // Find the event in criteriaManager
  const targetEvent = findEventById(targetEventId)
  if (!targetEvent) {
    console.warn(`Event with ID ${targetEventId} not found`)
    return
  }

  // Find the attribute within the event
  const targetAttribute = targetEvent.attributes?.find(attr => attr.id === targetAttributeId)
  if (!targetAttribute) {
    console.warn(`Attribute with ID ${targetAttributeId} not found in event ${targetEventId}`)
    return
  }

  // Update the attribute with the selected concepts as individual tag input items
  if (targetAttribute.attributeType === 'standard') {
    // Store the concept items in a way that the tag input can use them
    // We'll add a conceptItems property to store the selected concepts
    targetAttribute.conceptItems = conceptItems

    // Also update any existing conceptSet property for backward compatibility
    if (conceptItems.length > 0) {
      const firstConcept = conceptItems[0]
      if (firstConcept) {
        ;(targetAttribute as any).conceptSet = {
          value: firstConcept.value,
          text: conceptItems.map(c => c.text).join(', '),
          display_value: conceptItems.map(c => c.display_value).join(', '),
          conceptIds: conceptItems.map(c => Number(c.conceptId)),
          concepts: conceptItems.map(c => ({
            id: Number(c.conceptId),
            useMapped: false,
            isExcluded: false,
            useDescendants: false,
          })),
        }
      }
    }
  }
}

// Helper function to load concept set details for Atlas conversion
const loadConceptSetDetailsForEvent = async (event: any, conceptSet: ConceptSetItem) => {
  try {
    const { loadSingleConceptSetDetails } = await import('../services/ConceptSetApiService')
    const conceptSetDetails = await loadSingleConceptSetDetails(conceptSet, getDatasetId())

    // Update the event with concept set details
    event.conceptSetDetails = conceptSetDetails
    event.conceptSetLoading = false

    // Try to update the event in primary events (for regular events)
    const primaryEvents = criteriaManager.getPrimaryEvents()
    const primaryEvent = primaryEvents?.events?.find((e: any) => e.id === event.id)
    if (primaryEvent) {
      primaryEvent.conceptSetDetails = conceptSetDetails
      primaryEvent.conceptSetLoading = false
      primaryEvent.conceptSet = conceptSet.text || conceptSet.display_value || conceptSet.value
    } else {
      // Also check nested events within primary events
      let foundInPrimary = false
      if (primaryEvents?.events) {
        for (const primaryEvent of primaryEvents.events) {
          if (primaryEvent.attributes) {
            for (const attribute of primaryEvent.attributes) {
              if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
                const nestedEvent = attribute.nestedCriteria.events.find((ne: any) => ne.id === event.id)
                if (nestedEvent) {
                  nestedEvent.conceptSetDetails = conceptSetDetails
                  nestedEvent.conceptSetLoading = false
                  nestedEvent.conceptSet = conceptSet.text || conceptSet.display_value || conceptSet.value
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
          const regularEvent = group.events.find((e: any) => e.id === event.id)
          if (regularEvent) {
            regularEvent.conceptSetDetails = conceptSetDetails
            regularEvent.conceptSetLoading = false
            regularEvent.conceptSet = conceptSet.text || conceptSet.display_value || conceptSet.value
            found = true
            break
          }

          // Check nested events in this group
          for (const groupEvent of group.events) {
            if (groupEvent.attributes) {
              for (const attribute of groupEvent.attributes) {
                if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
                  const nestedEvent = attribute.nestedCriteria.events.find((ne: any) => ne.id === event.id)
                  if (nestedEvent) {
                    nestedEvent.conceptSetDetails = conceptSetDetails
                    nestedEvent.conceptSetLoading = false
                    nestedEvent.conceptSet = conceptSet.text || conceptSet.display_value || conceptSet.value
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

    // Trigger another UI update after details are loaded
    primaryEventsUpdateKey.value++
  } catch (error) {
    console.error('Failed to load concept set details:', error)
    event.conceptSetLoading = false
  }
}

// Helper function to update event concept set
// Reactive references for forcing UI updates
const primaryEventsUpdateKey = ref(0)
const primaryEventsData = computed(() => {
  // This computed property will trigger when primaryEventsUpdateKey changes
  primaryEventsUpdateKey.value // Access this to create dependency
  return criteriaManager.getPrimaryEvents()
})

// Reactive criteria data for nested attribute reactivity
const criteriaData = computed(() => {
  // This computed property will trigger when primaryEventsUpdateKey changes
  primaryEventsUpdateKey.value // Access this to create dependency
  return criteriaManager.getCriteria()
})

// Reactive exit criteria data for exit event reactivity
const exitCriteriaData = computed(() => {
  // This computed property will trigger when primaryEventsUpdateKey changes
  primaryEventsUpdateKey.value // Access this to create dependency
  return criteriaManager.getCensoringCriteria()
})

const updateEventConceptSet = (eventId: string, conceptSet: ConceptSetItem) => {
  const criteria = criteriaManager.getCriteria()

  // Check primary entry events first
  const primaryEvents = criteriaManager.getPrimaryEvents()
  if (primaryEvents?.events) {
    const event = primaryEvents.events.find((event: any) => event.id === eventId)
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

      // Update reactive reference to trigger UI updates
      primaryEventsUpdateKey.value++

      return
    }

    // Also check nested events within primary events attributes
    for (const event of primaryEvents.events) {
      if (event.attributes) {
        for (const attribute of event.attributes) {
          if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
            const nestedEvent = attribute.nestedCriteria.events.find((ne: any) => ne.id === eventId)
            if (nestedEvent) {
              // For nested events in primary events, store the concept set ID as a string
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

              // Trigger UI update for nested events in primary events too
              primaryEventsUpdateKey.value++
              return
            }
          }
        }
      }
    }
  }

  // Check inclusion criteria groups
  for (const group of criteria.criteria) {
    const event = group.events.find((event: any) => event.id === eventId)
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

      // Trigger UI update for criteria groups too
      primaryEventsUpdateKey.value++
      return
    }

    // Check nested criteria within attributes
    for (const event of group.events) {
      if (event.attributes) {
        for (const attribute of event.attributes) {
          if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
            const nestedEvent = attribute.nestedCriteria.events.find((ne: any) => ne.id === eventId)
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

              // Trigger UI update for nested criteria too
              primaryEventsUpdateKey.value++
              return
            }
          }
        }
      }
    }
  }
}

// Helper function to update attribute concept set
const updateAttributeConceptSet = (eventId: string, attributeId: string, conceptSet: ConceptSetItem) => {
  const criteria = criteriaManager.getCriteria()

  // Check criteria groups
  for (const group of criteria.criteria) {
    const event = group.events.find((event: any) => event.id === eventId)
    if (event) {
      const attribute = event.attributes?.find((attr: any) => attr.id === attributeId)
      if (attribute && 'conceptSet' in attribute) {
        // For attributes, store the full concept set object
        ;(attribute as any).conceptSet = conceptSet
        // Trigger UI update for attribute changes too
        primaryEventsUpdateKey.value++
        return
      } else {
      }
    }

    // Also check nested criteria within attributes
    for (const event of group.events) {
      if (event.attributes) {
        for (const attribute of event.attributes) {
          if (attribute.attributeType === 'nested' && attribute.nestedCriteria?.events) {
            // Look for the event in nested criteria
            const nestedEvent = attribute.nestedCriteria.events.find((ne: any) => ne.id === eventId)
            if (nestedEvent) {
              const nestedAttribute = nestedEvent.attributes?.find((attr: any) => attr.id === attributeId)
              if (nestedAttribute && 'conceptSet' in nestedAttribute) {
                // For nested attributes, store the full concept set object
                ;(nestedAttribute as any).conceptSet = conceptSet
                // Trigger UI update for nested attribute changes too
                primaryEventsUpdateKey.value++
                return
              }
            }
          }
        }
      }
    }
  }
}

const handleConceptSetAction = ({
  values,
  config,
  componentType,
  attributeId,
  eventId,
  parentAttributeId,
}: ConceptSetAction) => {
  try {
    const currentDatasetId = getDatasetId()
    if (!currentDatasetId) {
      console.error('Cannot open terminology - dataset ID not available')
      return
    }
    const conceptSetId = values?.value

    const domainFilter = config?.domainFilter
    const standardConceptCodeFilter = config?.standardConceptCodeFilter

    const defaultFilters = [
      { id: 'domainId', value: domainFilter ? [domainFilter] : [] },
      { id: 'concept', value: standardConceptCodeFilter ? [standardConceptCodeFilter] : [] },
    ]

    const handleCloseCallback = async (
      onCloseValues?: { currentConceptSet?: { id: string; name: string } } | undefined
    ) => {
      if (!onCloseValues?.currentConceptSet) {
        return
      }

      const conceptSetIdToFind = onCloseValues.currentConceptSet.id

      try {
        // Reload all concept sets to get complete data with concepts and flags
        await loadConceptSets()

        // Find the concept set with complete data from the fresh API response
        const completeConceptSet = allConceptSets.value.find(
          (cs: ConceptSetItem) => cs.value.toString() === conceptSetIdToFind.toString()
        )

        if (completeConceptSet) {
          // Use complete concept set data if found
          if (conceptSetId) {
            // Updating existing concept set
            console.log('Updating concept set:', completeConceptSet.text)
            const currentSets = selectedConceptSets.value
            const index = currentSets.findIndex((cs: ConceptSetItem) => cs.value.toString() === conceptSetId.toString())
            if (index !== -1) {
              const updatedSets = [...currentSets]
              updatedSets[index] = completeConceptSet
              selectedConceptSets.value = updatedSets
            }
          } else {
            // Adding new concept set
            console.log('Creating new concept set:', completeConceptSet.text)
            selectedConceptSets.value = [...selectedConceptSets.value, completeConceptSet]
          }

          // Update the specific field that triggered the modal
          if (eventId && attributeId && !parentAttributeId) {
            // This was triggered from a regular attribute concept set field
            updateAttributeConceptSet(eventId, attributeId, completeConceptSet)
          } else if (eventId && parentAttributeId) {
            // This was triggered from a nested event concept set field
            updateEventConceptSet(eventId, completeConceptSet)
          } else if (eventId) {
            // This was triggered from a regular event concept set field
            updateEventConceptSet(eventId, completeConceptSet)
          } else {
          }
        } else {
          // Fallback to basic data if concept set not found in reloaded data
          console.warn(`Could not find concept set with ID ${conceptSetIdToFind} after reloading, using basic data`)
        }
      } catch (error) {
        console.error('Error reloading concept sets after terminology update:', error)
        // Fallback to basic data if reload fails
        if (conceptSetId) {
          const currentSets = selectedConceptSets.value
          const index = currentSets.findIndex((cs: ConceptSetItem) => cs.value.toString() === conceptSetId.toString())
          if (index !== -1) {
            const updatedSets = [...currentSets]
            const currentItem = updatedSets[index]
            if (currentItem) {
              updatedSets[index] = {
                ...currentItem,
                text: onCloseValues.currentConceptSet.name,
                display_value: onCloseValues.currentConceptSet.name,
              }
            }
            selectedConceptSets.value = updatedSets

            // Update the specific field that triggered the modal
            if (eventId && attributeId && !parentAttributeId) {
              updateAttributeConceptSet(eventId, attributeId, updatedSets[index])
            } else if (eventId && parentAttributeId) {
              updateEventConceptSet(eventId, updatedSets[index])
            } else if (eventId) {
              updateEventConceptSet(eventId, updatedSets[index])
            }
          }
        } else {
          const newConceptSet = {
            text: onCloseValues.currentConceptSet.name,
            display_value: onCloseValues.currentConceptSet.name,
            value: onCloseValues.currentConceptSet.id,
            conceptIds: [],
            concepts: [],
          }
          selectedConceptSets.value = [...selectedConceptSets.value, newConceptSet]

          // Update the specific field that triggered the modal
          if (eventId && attributeId && !parentAttributeId) {
            updateAttributeConceptSet(eventId, attributeId, newConceptSet)
          } else if (eventId && parentAttributeId) {
            updateEventConceptSet(eventId, newConceptSet)
          } else if (eventId) {
            updateEventConceptSet(eventId, newConceptSet)
          }
        }
      }
    }

    // Determine mode based on component type
    const mode = componentType === 'concept' ? 'CONCEPT_MULTI_SELECT' : 'CONCEPT_SET'

    // Create appropriate callback based on mode
    const eventProps: TerminologyEventProps = {
      selectedDatasetId: currentDatasetId,
      selectedConceptSetId: conceptSetId,
      mode: mode,
      defaultFilters,
    }

    if (mode === 'CONCEPT_MULTI_SELECT') {
      // For multi-select mode, get existing concepts to pre-populate the modal
      // NOTE: This requires the portal's Terminology.tsx component to support the initialSelectedConcepts prop
      if (attributeId && eventId) {
        // For both regular and nested attributes, we should have attributeId
        const existingConcepts = getExistingConceptsForAttribute(eventId, attributeId)
        if (existingConcepts.length > 0) {
          eventProps.initialSelectedConcepts = existingConcepts
        }
      }

      // For multi-select mode, handle selected concepts via the onClose callback
      eventProps.onClose = (onCloseValues?: TerminologyCloseValues | undefined) => {
        if (onCloseValues?.selectedConcepts && onCloseValues.selectedConcepts.length > 0 && eventId) {
          // Transform selected concepts into tag input format while preserving all concept details
          const conceptItems: StoredConceptItem[] = onCloseValues.selectedConcepts.map((concept: SelectedConcept) => ({
            value: String(concept.conceptId),
            text: concept.display || concept.conceptName || concept.concept || 'Unknown',
            display_value: concept.display || concept.conceptName || concept.concept || 'Unknown',
            conceptId: concept.conceptId,
            // Preserve all original concept details for future pre-selection
            domainId: concept.domainId,
            system: concept.system,
            conceptClassId: concept.conceptClassId,
            standardConcept: concept.standardConcept,
            concept: concept.concept,
            code: concept.code,
            validStartDate: concept.validStartDate,
            validEndDate: concept.validEndDate,
            validity: concept.validity,
            useDescendants: concept.useDescendants,
            useMapped: concept.useMapped,
            isExcluded: concept.isExcluded,
            score: concept.score,
            // Store conceptName for backward compatibility
            conceptName: concept.display || concept.concept,
          }))

          // Update the specific attribute with the selected concepts
          if (attributeId) {
            // Both regular and nested attributes should have attributeId
            updateAttributeWithConcepts(eventId, attributeId, conceptItems)
          }
        }
      }
    } else {
      // For concept set mode, use existing callback
      eventProps.onClose = handleCloseCallback
    }

    const event = new CustomEvent('alp-terminology-open', {
      detail: {
        props: eventProps,
      },
    })

    window.dispatchEvent(event)
  } catch (error: unknown) {
    console.error('Error in handleConceptSetAction:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    )
  }
}

// Save dialog methods
const openSaveDialog = () => {
  showSaveDialog.value = true

  // Default to existing bookmark name if available
  const activeBookmark = store?.getters?.getActiveBookmark
  cohortName.value = activeBookmark?.bookmarkname || activeBookmark?.name || ''

  isInvalidName.value = false
}

const closeSaveDialog = () => {
  showSaveDialog.value = false
  cohortName.value = ''
  isInvalidName.value = false
}

const saveAtlasCohort = async () => {
  try {
    if (!cohortName.value.trim()) {
      isInvalidName.value = true
      return
    }

    if (hasExceededLength.value) {
      return
    }

    // Get the Atlas format JSON
    const atlasExpression = convertToAtlasFormat()

    // Get current user info
    const portalAPI = getPortalAPI()
    const username = portalAPI?.username || 'system'
    const currentDatasetId = getDatasetId()

    if (!currentDatasetId) {
      console.error('Cannot save cohort: Dataset ID not available')
      return
    }

    // Create cohort definition object
    const cohortDefinition = {
      name: cohortName.value.trim(),
      description: `Atlas cohort definition created from QueryFilter`,
      expressionType: 'SIMPLE_EXPRESSION',
      expression: atlasExpression,
      tags: [],
      createdBy: username,
      createdDate: Date.now(),
      modifiedBy: username,
      modifiedDate: Date.now(),
      hasWriteAccess: true,
      hasReadAccess: true,
    }

    console.log('Saving Atlas cohort:', cohortDefinition)

    const activeBookmark = store?.getters?.getActiveBookmark

    await store.dispatch('fireUpdateAtlasCohortDefinitionQuery', {
      content: {
        id: parseInt(activeBookmark.bmkId),
        ...cohortDefinition,
      },
    })

    console.log('Atlas cohort saved successfully')
    closeSaveDialog()
  } catch (error) {
    console.error('Error saving Atlas cohort:', error)
  }
}

// Expose functions so parent components can access them
defineExpose({
  convertToAtlasFormat,
  loadAtlasCohortDefinition,
})
</script>

<template>
  <div class="query-filter-modern">
    <!-- Overlay SplashScreen -->
    <SplashScreen v-if="isLoading" class="splash-overlay" />

    <!-- Main Query Filter Content Container -->
    <div class="query-filter-main-container">
      <div class="query-filter-header-container">
        <div class="header-container-right"></div>
        <div class="header-container-left">
          <div class="left-button-group">
            <ButtonMaterial @button-click="openSaveDialog">Save</ButtonMaterial>
          </div>
        </div>
      </div>
      <div class="query-filter-container">
        <div class="query-filter-container__section">
          <QueryFilterEntryExit
            type="ENTRY"
            :primary-events-data="primaryEventsData"
            :key="`entry-${primaryEventsUpdateKey}`"
            :concept-sets="allConceptSets"
            :concept-set-domain-values="conceptSetDomainValues"
            :concept-set-texts="tagInputTexts"
            @update-limit="handleUpdatePrimaryCriteriaLimit"
            @update-entry-days="handleUpdateEntryDays"
            @concept-set-action="handleConceptSetAction"
          />
        </div>
      </div>
      <div class="query-filter-container">
        <!-- New Hierarchical Component Structure -->
        <div class="query-filter-container__section">
          <QueryFilterCriteria
            :criteria-data="criteriaData"
            :key="`criteria-${primaryEventsUpdateKey}`"
            :concept-sets="allConceptSets"
            :concept-set-domain-values="conceptSetDomainValues"
            :concept-set-texts="tagInputTexts"
            :dataset-id="datasetId"
            @criteria-updated="handleCriteriaUpdated"
            @update:criteria="handleCriteriaUpdated"
            @update-qualifying-limit="handleUpdateQualifyingLimit"
            @add-criteria-group="handleAddCriteriaGroup"
            @update-criteria-group="handleUpdateCriteriaGroup"
            @remove-criteria-group="handleRemoveCriteriaGroup"
            @concept-set-action="handleConceptSetAction"
          />
        </div>
      </div>

      <div class="query-filter-container">
        <div class="query-filter-container__section">
          <QueryFilterEntryExit
            type="EXIT"
            :exit-criteria-data="exitCriteriaData"
            :key="`exit-${primaryEventsUpdateKey}`"
            :concept-sets="allConceptSets"
            :concept-set-domain-values="conceptSetDomainValues"
            :concept-set-texts="tagInputTexts"
            @update-limit="handleUpdateExitStrategy"
            @concept-set-action="handleConceptSetAction"
          />
        </div>
      </div>
    </div>

    <!-- Debug Toggle -->
    <div class="debug-toggle-section">
      <label class="debug-toggle">
        <input type="checkbox" v-model="showDebug" class="debug-checkbox" />
        <span class="debug-label">Show Debug Information</span>
      </label>
    </div>

    <!-- Debug Tag Input Section -->
    <div v-if="showDebug" class="query-filter-debug-section">
      <div class="debug-tag-input">
        <div style="margin-bottom: 16px">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px">
            Global Concept Set Selection (Debug):
          </label>
          <QueryFilterTagInputAdapter
            :model="tagInputModel"
            :external-value="selectedConceptSets"
            :external-domain-values="tagInputDomainValues"
            :external-texts="tagInputTexts"
            :is-catalog-attribute="false"
            @update:value="handleConceptSetUpdate"
            @search-change="handleSearchChange"
            @concept-set-action="handleConceptSetAction"
          />
        </div>

        <div
          v-if="showDebug"
          style="
            margin-top: 8px;
            padding: 8px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            font-size: 12px;
          "
        >
          <strong>Debug:</strong> Model ID: {{ tagInputModel.id }}, Type: {{ tagInputModel.props.type }}, Value length:
          {{ tagInputModel.props.value.length }}
        </div>
      </div>
    </div>

    <!-- Concept Set Details Debug Section -->
    <div v-if="showDebug && selectedConceptSetValues.length > 0" class="concept-set-debug">
      <div style="margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e0e0e0">
        <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #333">Selected Concept Set Values:</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px">
          <div
            v-for="item in selectedConceptSetValues"
            :key="item.value"
            style="
              background: #e3f2fd;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              border: 1px solid #bbdefb;
            "
          >
            <strong>{{ item.text || item.display_value }}</strong>
            <span v-if="item.value" style="color: #666; margin-left: 4px">({{ item.value }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="showDebug" class="query-filter-actions">
      <button class="btn btn-primary" @click="applyFilters">Apply Filters</button>
      <button class="btn btn-secondary" @click="clearFilters">Clear All</button>
      <button class="btn btn-link" @click="exportFilters">Export Configuration</button>
    </div>

    <!-- Debug Output -->
    <div v-if="showDebug" class="query-filter-debug">
      <h3>Debug Information</h3>
      <div class="debug-columns">
        <div class="debug-column">
          <h4>Hierarchical Criteria JSON:</h4>
          <pre>{{ JSON.stringify(getAllFilters(), null, 2) }}</pre>
        </div>

        <div class="debug-column">
          <h4>Atlas JSON:</h4>
          <pre>{{ JSON.stringify(convertToAtlasFormat(), null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Save Dialog -->
    <messageBox v-if="showSaveDialog" dim="true" @close="closeSaveDialog">
      <template v-slot:header>{{ getText('MRI_PA_TITLE_SAVE_BOOKMARK') || 'Save Cohort' }}</template>
      <template v-slot:body>
        <div>
          <div class="save-bookmark">
            <div class="form-group">
              <div class="name">
                <div class="row">
                  <div class="col-sm-12 form-check col-form-label">
                    <label>Enter a name for the cohort:</label>
                  </div>
                </div>
                <div class="row">
                  <div class="col">
                    <input
                      class="form-control"
                      :class="{ 'is-invalid': isInvalidName }"
                      :placeholder="getText('MRI_PA_COLL_ENTER_NAME') || 'Enter cohort name'"
                      v-model="cohortName"
                      tabindex="0"
                      required
                      :maxlength="maxLength"
                    />
                    <div class="invalid-feedback" :style="isInvalidName ? 'display: block' : ''">
                      Please enter a valid name
                    </div>
                    <div class="invalid-feedback" :style="hasExceededLength ? 'display: block' : ''">
                      Cohort name must not exceed {{ maxLength }} characters
                    </div>
                  </div>
                </div>
              </div>

              <div class="row row-checkbox">
                <appCheckbox
                  v-model="shareBookmark"
                  :text="getText('MRI_PA_BMK_SHARED_BOOKMARK_TEXT') || 'Share this cohort with other users'"
                  :title="getText('MRI_PA_BMK_SHARED_BOOKMARK_TITLE') || 'Make this cohort available to other users'"
                ></appCheckbox>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton
          :click="saveAtlasCohort"
          :text="getText('MRI_PA_BUTTON_SAVE') || 'Save'"
          :tooltip="getText('MRI_PA_BUTTON_SAVE') || 'Save'"
          :disabled="hasExceededLength || !cohortName.trim()"
        ></appButton>
        <appButton
          :click="closeSaveDialog"
          :text="getText('MRI_PA_BUTTON_CANCEL') || 'Cancel'"
          :tooltip="getText('MRI_PA_BUTTON_CANCEL') || 'Cancel'"
        ></appButton>
      </template>
    </messageBox>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-modern {
  height: calc(100% - 35px);
  overflow: auto;
  position: relative;

  // Overlay styles for SplashScreen
  .splash-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .query-filter-debug-header {
    margin-bottom: 16px;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;

    h2 {
      margin: 0 0 8px 0;
      font-size: 20px;
    }

    .debug-info {
      display: flex;
      gap: 8px;
    }

    .debug-badge {
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
  }

  .query-filter-main-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    justify-content: center;
    align-items: center;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    padding: 16px 0 16px 0;
    // margin-bottom: 16px;
  }

  .query-filter-header-container {
    width: 90%;
    display: flex;
    justify-content: space-between;
  }
  .query-filter-container {
    width: 90%;
    // padding: 16px;
    // margin: 16px;
    // margin: 4px &__section {
    //   margin-bottom: 0; // Remove bottom margin since container handles spacing
    // }
  }

  .debug-toggle-section {
    padding: 12px 16px;
    border-top: 1px solid #e0e0e0;
    background: #f8f9fa;
  }

  .debug-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  .debug-checkbox {
    width: 16px;
    height: 16px;
    margin: 0;
  }

  .debug-label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  .query-filter-legacy-section {
    .legacy-notice {
      padding: 12px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
      margin-bottom: 16px;

      p {
        margin: 0;
        color: #856404;
        font-size: 14px;

        code {
          background: rgba(133, 100, 4, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 12px;
        }
      }
    }
  }

  .query-filter-debug-section {
    margin-bottom: 16px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .concept-set-debug {
    margin-bottom: 16px;
  }

  .query-filter-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &.btn-primary {
        background: #1976d2;
        color: white;

        &:hover {
          background: #1565c0;
        }
      }

      &.btn-secondary {
        background: #6c757d;
        color: white;

        &:hover {
          background: #5a6268;
        }
      }

      &.btn-link {
        background: transparent;
        color: #1976d2;
        border: 1px solid #1976d2;

        &:hover {
          background: #1976d2;
          color: white;
        }
      }
    }
  }

  .query-filter-debug {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e0e0e0;

    h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: #333;
    }

    .debug-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .debug-column {
      h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #666;
      }

      pre {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 12px;
        font-size: 11px;
        overflow-x: auto;
        max-height: 400px;
        overflow-y: auto;
      }
    }
  }
}

// Import existing styles for backward compatibility
@import '../styles/QueryFilter';
</style>
