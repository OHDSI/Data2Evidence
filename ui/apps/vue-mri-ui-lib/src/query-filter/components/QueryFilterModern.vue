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
import { QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import { QueryFilterEvent, QueryFilterGroup } from '../types/QueryFilterTypes'
import QueryFilterTagInputAdapter from '../../lib/ui/QueryFilterTagInputAdapter.vue'
import { loadConceptSets } from '../utils/QueryFilterModern/loadConceptSets'
import type {
  ConceptSetItemDisplay,
  ConceptSetDomainValues,
  TagInputModel,
  ConceptSetAction,
  SelectedConcept,
  StoredConceptItem,
} from '../types/ConceptSetTypes'
import type { AtlasBookmark } from '../types/AtlasTypes'

import {
  loadConceptSetDetails as apiLoadConceptSetDetails,
  loadSingleConceptSetDetails,
} from '../services/ConceptSetApiService'
import { filterConceptSets, getTagInputTexts, createDefaultConceptSetDomainValues } from '../utils/ConceptSetHelpers'
import QueryFilterEntryExit from './QueryFilterEntryExit.vue'
import { getPortalAPI } from '../../utils/PortalUtils'
import ButtonMaterial from './ButtonMaterial.vue'
import SplashScreen from '@/components/SplashScreen.vue'
import messageBox from '../../components/MessageBox.vue'
import appButton from '../../lib/ui/app-button.vue'
import appCheckbox from '../../lib/ui/app-checkbox.vue'
import { loadAtlasCohortDefinition } from '../utils/QueryFilterModern/loadAtlasCohortDefinition'
import * as types from '../../store/mutation-types'

// Interface for close callback values from terminology modal
interface TerminologyCloseValues {
  currentConceptSet?: { id: string; name: string }
  selectedConcepts?: SelectedConcept[]
}

// Interface for component props
interface Props {
  atlasData?: AtlasBookmark | null
}

const props = defineProps<Props>()

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

const selectedConceptSets = ref<ConceptSetItemDisplay[]>([])

const conceptSetsFromCriteria = computed(() => {
  const conceptSets: ConceptSetItemDisplay[] = []
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

const loadingConceptDetails = ref(false)

const tagInputTexts = getTagInputTexts()

const allConceptSets = ref<ConceptSetItemDisplay[]>([])
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

const loadConceptSetDetails = async (selectedConceptSets: ConceptSetItemDisplay[]) => {
  if (selectedConceptSets.length === 0) {
    return
  }

  const currentDatasetId = getDatasetId()
  if (!currentDatasetId) {
    console.warn('Cannot load concept set details: Dataset ID not available from store or portalAPI')
    return
  }

  loadingConceptDetails.value = true

  try {
    const result = await apiLoadConceptSetDetails(selectedConceptSets, currentDatasetId)
  } catch (error) {
    console.error('Error loading concept set details:', error)
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
    }
  },
  { deep: true }
)

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

const handleUpdateFixedDuration = (eventDateOffset: 'StartDate' | 'EndDate', daysOffset: number) => {
  criteriaManager.updateFixedDuration(eventDateOffset, daysOffset)
  console.log('Fixed duration updated:', eventDateOffset, daysOffset)
}

const handleUpdateContDrugSettings = (
  conceptSetId: string,
  gapDays: number,
  offset: number,
  daysSupplyOverride: number
) => {
  criteriaManager.updateContDrugSettings(conceptSetId, gapDays, offset, daysSupplyOverride)
  console.log('CONT_DRUG settings updated:', conceptSetId, gapDays, offset, daysSupplyOverride)
}

// Handle primary events updates
const handleUpdatePrimaryEvents = (events: QueryFilterEvent[]) => {
  criteriaManager.updatePrimaryEvents(events)
}

// Handle exit events updates
const handleUpdateExitEvents = (events: QueryFilterEvent[]) => {
  criteriaManager.updateCensoringCriteria(events)
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

watch(
  () => {
    return props.atlasData
  },
  async newAtlasData => {
    if (newAtlasData === null) {
      // Initialize empty state for new Atlas cohort
      criteriaManager.clearAllCriteria()
      selectedConceptSets.value = []
      isLoading.value = true

      // Load concept sets for new Atlas cohort so they're available in dropdown
      await loadConceptSets(getDatasetId, allConceptSets, conceptSetDomainValues)

      isLoading.value = false
    } else if (newAtlasData) {
      // Load existing Atlas cohort
      await loadAtlasCohortDefinition(
        newAtlasData,
        isLoading,
        allConceptSets,
        getDatasetId,
        conceptSetDomainValues,
        criteriaManager,
        conceptSetsFromCriteria,
        nextTick,
        selectedConceptSets
      )
    }
  },
  { immediate: true }
)

const handleConceptSetUpdate = (value: ConceptSetItemDisplay[]) => {
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

// Function to get existing concepts from an attribute for pre-populating the modal
const getExistingConceptsForAttribute = (targetEventId: string, targetAttributeId: string): SelectedConcept[] => {
  const targetEvent = findEventById(targetEventId)
  if (!targetEvent) {
    return []
  }

  // First try to find by id, then by attributeId
  let targetAttribute = targetEvent.attributes?.find(attr => attr.id === targetAttributeId)
  if (!targetAttribute) {
    // Try to find by attributeId (for Atlas JSON loaded attributes)
    targetAttribute = targetEvent.attributes?.find(
      attr => 'attributeId' in attr && attr.attributeId === targetAttributeId
    )
  }

  if (!targetAttribute) {
    return []
  }

  // Check if attribute has conceptItems (from previous CONCEPT_MULTI_SELECT)
  if ('conceptItems' in targetAttribute && targetAttribute.conceptItems) {
    const storedItems = targetAttribute.conceptItems as StoredConceptItem[]
    return storedItems.map((item: StoredConceptItem) => ({
      conceptId: Number(item.conceptId || item.value),
      display: item.display_value || item.text || 'Unknown',
      domainId: item.domainId || 'Unknown',
      system: item.system,
      conceptClassId: item.conceptClassId,
      standardConcept: item.standardConcept,
      concept: item.concept || item.text,
      conceptName: item.conceptName || item.text, // Add conceptName property
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
      .filter(concept => concept.id || concept.concept_id) // Only include concepts with valid IDs
      .map(concept => ({
        conceptId: concept.id || concept.concept_id || 0,
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

  // Find the attribute within the event - try by id first, then by attributeId
  let targetAttribute = targetEvent.attributes?.find(attr => attr.id === targetAttributeId)
  if (!targetAttribute) {
    // Try to find by attributeId (for Atlas JSON loaded attributes)
    targetAttribute = targetEvent.attributes?.find(
      attr => 'attributeId' in attr && attr.attributeId === targetAttributeId
    )
  }

  if (!targetAttribute) {
    console.warn(`Attribute with ID ${targetAttributeId} not found in event ${targetEventId}`)
    return
  }

  // Update the attribute with the selected concepts as individual tag input items
  if (targetAttribute.attributeType === 'standard') {
    // Store the concept items in a way that the tag input can use them
    // We'll add a conceptItems property to store the selected concepts
    targetAttribute.conceptItems = conceptItems

    // Clear any existing conceptSet property since these are individual concepts, not concept sets
    if ('conceptSet' in targetAttribute) {
      delete targetAttribute.conceptSet
    }
  }
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
      primaryEvent.conceptSet = conceptSet.text || conceptSet.display_value || conceptSet.value
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
                    nestedEvent.conceptSet = conceptSet.text || conceptSet.display_value || conceptSet.value
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
            regularEvent.conceptSet = conceptSet.text || conceptSet.display_value || conceptSet.value
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
  } catch (error) {
    console.error('Failed to load concept set details:', error)
    event.conceptSetLoading = false
  }
}

const primaryEventsData = computed(() => {
  return criteriaManager.getPrimaryEvents()
})

// Reactive criteria data for nested attribute reactivity
const criteriaData = computed(() => {
  return criteriaManager.getCriteria()
})

// Reactive exit criteria data for exit event reactivity
const exitCriteriaData = computed(() => {
  return criteriaManager.getCensoringCriteria()
})

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
              nestedEvent.conceptSet = conceptSet.text || conceptSet.display_value || ''

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

// Helper function to update attribute concept set
const updateAttributeConceptSet = (eventId: string, attributeId: string, conceptSet: ConceptSetItemDisplay) => {
  const criteria = criteriaManager.getCriteria()

  // Check criteria groups
  for (const group of criteria.criteria) {
    const event = group.events.find(event => event.id === eventId)
    if (event) {
      const attribute = event.attributes?.find(attr => attr.id === attributeId)
      if (attribute && 'conceptSet' in attribute) {
        // For attributes, store the full concept set object
        attribute.conceptSet = conceptSet
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
            const nestedEvent = attribute.nestedCriteria.events.find(ne => ne.id === eventId)
            if (nestedEvent) {
              const nestedAttribute = nestedEvent.attributes?.find(attr => attr.id === attributeId)
              if (nestedAttribute && 'conceptSet' in nestedAttribute) {
                // For nested attributes, store the full concept set object
                nestedAttribute.conceptSet = conceptSet
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
  action,
  removedItem,
}: ConceptSetAction) => {
  try {
    // Handle concept removal for multiselect concepts
    if (action === 'remove' && componentType === 'concept' && attributeId && eventId) {
      // Find the target attribute and update its conceptItems
      const targetEvent = findEventById(eventId)
      if (targetEvent) {
        const targetAttribute = targetEvent.attributes?.find(
          attr => 'attributeId' in attr && attr.attributeId === attributeId
        )

        if (targetAttribute && 'conceptItems' in targetAttribute) {
          // Remove the concept from conceptItems array
          const updatedConceptItems = targetAttribute.conceptItems.filter(
            item => item.conceptId !== removedItem.conceptId
          )

          // Update the attribute's conceptItems
          targetAttribute.conceptItems = updatedConceptItems
          return // Exit early for removal actions
        }
      }
    }

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
        await loadConceptSets(getDatasetId, allConceptSets, conceptSetDomainValues)
        // Find the concept set with complete data from the fresh API response
        const completeConceptSet = allConceptSets.value.find(
          (cs: ConceptSetItemDisplay) => cs.value.toString() === conceptSetIdToFind.toString()
        )
        if (completeConceptSet) {
          // Use complete concept set data if found
          if (conceptSetId) {
            // Updating existing concept set
            console.log('Updating concept set:', completeConceptSet.text)
            const currentSets = selectedConceptSets.value
            const index = currentSets.findIndex(
              (cs: ConceptSetItemDisplay) => cs.value.toString() === conceptSetId.toString()
            )
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
          const index = currentSets.findIndex(
            (cs: ConceptSetItemDisplay) => cs.value.toString() === conceptSetId.toString()
          )
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
        if (onCloseValues?.selectedConcepts && onCloseValues.selectedConcepts.length >= 0 && eventId) {
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

    const activeBookmark = store?.getters?.getActiveBookmark
    const isNewBookmark = !activeBookmark?.bmkId || activeBookmark?.isNew

    if (isNewBookmark) {
      // Create new Atlas cohort
      const response = await store.dispatch('fireCreateAtlasCohortDefinitionQuery', {
        content: {
          ...cohortDefinition,
          id: 0, // 0 indicates a new cohort in webapi
        },
      })

      // Update active bookmark with the new ID
      const updatedBookmark = {
        ...activeBookmark,
        bmkId: response.id?.toString(),
        bookmarkname: cohortName.value.trim(),
        isNew: false,
      }

      store.commit(types.SET_ACTIVE_BOOKMARK, updatedBookmark)
    } else {
      // Update existing Atlas cohort
      await store.dispatch('fireUpdateAtlasCohortDefinitionQuery', {
        content: {
          id: parseInt(activeBookmark.bmkId),
          ...cohortDefinition,
        },
      })

      // Update bookmark name if changed
      if (activeBookmark.bookmarkname !== cohortName.value.trim()) {
        const updatedBookmark = {
          ...activeBookmark,
          bookmarkname: cohortName.value.trim(),
        }
        store.commit(types.SET_ACTIVE_BOOKMARK, updatedBookmark)
      }
    }
    closeSaveDialog()
  } catch (error) {
    console.error('Error saving Atlas cohort:', error)
  }
}
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
            :concept-sets="allConceptSets"
            :concept-set-domain-values="conceptSetDomainValues"
            :concept-set-texts="tagInputTexts"
            @update-limit="handleUpdatePrimaryCriteriaLimit"
            @update-entry-days="handleUpdateEntryDays"
            @update-primary-events="handleUpdatePrimaryEvents"
            @concept-set-action="handleConceptSetAction"
          />
        </div>
      </div>
      <div class="query-filter-container">
        <!-- New Hierarchical Component Structure -->
        <div class="query-filter-container__section">
          <QueryFilterCriteria
            :criteria-data="criteriaData"
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
            :concept-sets="allConceptSets"
            :concept-set-domain-values="conceptSetDomainValues"
            :concept-set-texts="tagInputTexts"
            @update-limit="handleUpdateExitStrategy"
            @update-exit-events="handleUpdateExitEvents"
            @concept-set-action="handleConceptSetAction"
            @update-fixed-duration="handleUpdateFixedDuration"
            @update-cont-drug-settings="handleUpdateContDrugSettings"
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
@import '../styles/QueryFilterModern';
// Import existing styles for backward compatibility
@import '../styles/QueryFilter';
</style>
