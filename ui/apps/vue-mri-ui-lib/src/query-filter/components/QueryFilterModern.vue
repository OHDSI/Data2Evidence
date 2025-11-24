<script lang="ts">
export default {
  name: 'QueryFilterModern',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, getCurrentInstance, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
import QueryFilterCriteria from './QueryFilterCriteria.vue'
import QueryFilterTagInputAdapter from '../../lib/ui/QueryFilterTagInputAdapter.vue'
import { loadConceptSets } from '../utils/QueryFilterModern/loadConceptSets'
import type {
  ConceptSetItemDisplay,
  TagInputModel,
  ConceptSetAction,
  SelectedConcept,
  StoredConceptItem,
  IWebapiSource,
  CohortInfoResponse,
  Notification,
} from '../types/ConceptSetTypes'
import type { AtlasBookmark } from '../types/AtlasTypes'
import { getTagInputTexts } from '../utils/ConceptSetHelpers'
import { useConceptSets } from '../composables/useConceptSets'
import { useDatasetId } from '../composables/useDatasetId'
import QueryFilterEntryExit from './QueryFilterEntryExit.vue'
import { getPortalAPI } from '../../utils/PortalUtils'
import ButtonMaterial from './ButtonMaterial.vue'
import SplashScreen from '@/components/SplashScreen.vue'
import messageBox from '../../components/MessageBox.vue'
import appButton from '../../lib/ui/app-button.vue'
import appCheckbox from '../../lib/ui/app-checkbox.vue'
import GenerateCohortActiveIcon from '../../components/icons/GenerateCohortActiveIcon.vue'
import { loadAtlasCohortDefinition } from '../utils/QueryFilterModern/loadAtlasCohortDefinition'
import * as types from '../../store/mutation-types'
import { useCriteriaManager } from '../composables/useCriteriaManager'
import { d2eWebapiService } from '../services/D2eWebapiService'
import { QueryFilterEvent } from '../types/QueryFilterTypes'

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

const store = useStore()

const showDebug = ref(false)

const showSaveDialog = ref(false)
const cohortName = ref('')
const shareBookmark = ref(false)
const isInvalidName = ref(false)

const isLoading = ref(false)

// Action bar state
const selectedDatasetForGeneration = ref('')
const availableSources = ref<IWebapiSource[]>([])
const patientCount = ref<number | null>(null)
const isGeneratingCohort = ref(false)
const cohortInfo = ref<CohortInfoResponse>([])
const isLoadingCohortInfo = ref(false)
const generationStatus = ref<'idle' | 'pending' | 'complete' | 'failed'>('idle')
let pollingInterval: ReturnType<typeof setInterval> | null = null
const POLLING_INTERVAL_MS = 2000

// Check if running in Atlas mode (standalone mode)
const isAtlas = computed(() => {
  const portalAPI = getPortalAPI()
  return portalAPI?.isLocal === true
})

// Max length for cohort names - no limit in Atlas mode, 40 chars in D2E Portal mode
const maxLength = computed(() => {
  return isAtlas.value ? undefined : 40
})

// Initialize selectedDatasetForGeneration based on mode
const initializeDatasetSelection = () => {
  if (isAtlas.value) {
    // In Atlas mode, will be set when sources are fetched
    if (availableSources.value.length > 0) {
      selectedDatasetForGeneration.value = availableSources.value[0].sourceKey
    }
  } else {
    // In portal mode, use the datasetId from portal context
    selectedDatasetForGeneration.value = getDatasetId()
  }
}

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

const tagInputTexts = getTagInputTexts()

// Initialize dataset ID composable
const { datasetId, getDatasetId } = useDatasetId(store)

// Initialize concept sets composable
const {
  selectedConceptSets,
  allConceptSets,
  conceptSetDomainValues,
  selectedConceptSetValues,
  loadingConceptDetails,
  loadConceptSetDetails,
  handleConceptSetUpdate,
  handleSearchChange,
  clearConceptSets,
} = useConceptSets(getDatasetId)

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

const getText = (key: string, ...args: (string | number)[]) => {
  return store?.getters?.getText?.(key, ...args) || key
}

const hasExceededLength = computed(() => {
  // No length limit in Atlas mode
  if (maxLength.value === undefined) {
    return false
  }
  return cohortName.value.length >= maxLength.value
})

const debug = computed(() => {
  const portalAPI = getPortalAPI()
  return portalAPI?.debug
})

// Action bar computed properties
const displayCohortName = computed(() => {
  const activeBookmark = store?.getters?.getActiveBookmark
  return activeBookmark?.bookmarkname || activeBookmark?.name || 'Untitled Cohort'
})

const displayPatientCount = computed(() => {
  if (generationStatus.value === 'pending') {
    return 'Pending'
  }
  if (generationStatus.value === 'failed') {
    return 'Failed'
  }
  return patientCount.value !== null ? patientCount.value.toLocaleString() : '-'
})

// Helper to recursively check if event or its nested events are loading
const isEventOrNestedLoading = (event: QueryFilterEvent): boolean => {
  // Check if this event is loading
  if (event.conceptSetLoading) {
    return true
  }

  // Check if this event has concept set but missing details
  if (event.conceptSetId && (!event.conceptSetDetails || event.conceptSetDetails.length === 0)) {
    return true
  }

  // Recursively check nested events in nestedCriteria (for groups)
  if (event.nestedCriteria?.events) {
    for (const nestedEvent of event.nestedCriteria.events) {
      if (isEventOrNestedLoading(nestedEvent)) {
        return true
      }
    }
  }

  // Recursively check nested events in attributes
  if (event.attributes) {
    for (const attr of event.attributes) {
      if (attr.attributeType === 'nested' && attr.nestedCriteria?.events) {
        for (const nestedEvent of attr.nestedCriteria.events) {
          if (isEventOrNestedLoading(nestedEvent)) {
            return true
          }
        }
      }
    }
  }

  return false
}

// Check if all concept details are loaded and ready to save
const isReadyToSave = computed(() => {
  // Don't allow save if main component or concept details are loading
  if (isLoading.value || loadingConceptDetails.value) {
    return false
  }

  // Check if all events with concept sets have their details loaded
  const criteria = criteriaManager.getCriteria()

  // Check entry events (recursively)
  if (primaryEventsData.value?.events) {
    for (const event of primaryEventsData.value.events) {
      if (isEventOrNestedLoading(event)) {
        return false
      }
    }
  }

  // Check inclusion criteria groups (recursively)
  for (const group of criteria.criteria) {
    for (const event of group.events) {
      if (isEventOrNestedLoading(event)) {
        return false
      }
    }
  }

  // Check exit events (recursively)
  if (exitCriteriaData.value?.censoringCriteria) {
    for (const event of exitCriteriaData.value.censoringCriteria) {
      if (isEventOrNestedLoading(event)) {
        return false
      }
    }
  }

  return true
})

// Get message explaining why save is disabled
const saveDisabledReason = computed(() => {
  if (isLoading.value) {
    return 'Loading cohort definition...'
  }
  if (loadingConceptDetails.value) {
    return 'Loading concept details...'
  }

  // Check for events still loading
  const criteria = criteriaManager.getCriteria()
  const allEvents = [
    ...(primaryEventsData.value?.events || []),
    ...criteria.criteria.flatMap(g => g.events),
    ...(exitCriteriaData.value?.censoringCriteria || []),
  ]

  const loadingEvent = allEvents.find(e => e.conceptSetLoading)
  if (loadingEvent) {
    return `Loading concepts for ${loadingEvent.conceptSet || 'event'}...`
  }

  // Check for events with concept sets but no details
  const incompleteEvent = allEvents.find(
    e => e.conceptSetId && (!e.conceptSetDetails || e.conceptSetDetails.length === 0)
  )
  if (incompleteEvent) {
    return `Missing concept details for ${incompleteEvent.conceptSet || 'event'}`
  }

  return ''
})

// Initialize criteria manager composable
const {
  criteriaManager,
  primaryEventsData,
  criteriaData,
  exitCriteriaData,
  conceptSetsFromCriteria,
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
  getAllFilters,
  convertToAtlasFormat,
  clearFilters,
  initializeComponent,
  findEventById,
  loadConceptSetDetailsForEvent,
  updateEventConceptSet,
} = useCriteriaManager(getDatasetId, allConceptSets, clearConceptSets)

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

onMounted(async () => {
  initializeComponent()

  // Fetch sources when in Atlas mode
  if (isAtlas.value) {
    try {
      const sources = await d2eWebapiService.getSources()
      availableSources.value = sources
      // Initialize dataset selection after sources are fetched
      initializeDatasetSelection()
    } catch (error) {
      console.error('Error fetching sources:', error)
    }
  } else {
    // Initialize with portal datasetId
    initializeDatasetSelection()
  }
})

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

      // Clear cohort info for new cohort
      cohortInfo.value = []
      patientCount.value = null
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
        selectedConceptSets,
        isAtlas.value
      )

      // Fetch cohort info after loading cohort definition
      if (newAtlasData.id) {
        await fetchCohortInfo(newAtlasData.id)
      }
    }
  },
  { immediate: true }
)

// Watch for dataset selection changes and update patient count
watch(selectedDatasetForGeneration, () => {
  if (cohortInfo.value.length > 0) {
    updatePatientCountFromInfo()
  }
})

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

// Helper function to check if any events are still loading concept details
const checkAndWaitForConceptDetails = async (): Promise<boolean> => {
  const criteria = criteriaManager.getCriteria()

  // Collect all events from all groups
  const allEvents: QueryFilterEvent[] = []

  // Entry events
  if (criteriaManager.getPrimaryEvents()?.events) {
    allEvents.push(...criteriaManager.getPrimaryEvents().events)
  }

  // Inclusion criteria events
  for (const group of criteria.criteria) {
    allEvents.push(...group.events)
  }

  // Exit events
  if (criteriaManager.getCensoringCriteria()?.censoringCriteria) {
    allEvents.push(...criteriaManager.getCensoringCriteria().censoringCriteria)
  }

  // Check if any event with a concept set is still loading
  const eventsStillLoading = allEvents.filter(event => event.conceptSetId && event.conceptSetLoading === true)

  if (eventsStillLoading.length > 0) {
    console.log(`Waiting for ${eventsStillLoading.length} concept set(s) to finish loading...`)

    // Poll every 500ms until all concept details are loaded (max 30 seconds)
    const maxWaitTime = 30000
    const pollInterval = 500
    let elapsed = 0

    while (elapsed < maxWaitTime) {
      // Re-check if any are still loading
      const stillLoading = allEvents.some(event => event.conceptSetId && event.conceptSetLoading === true)

      if (!stillLoading) {
        console.log('All concept details loaded successfully')
        return true
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      elapsed += pollInterval
    }

    console.warn('Timeout waiting for concept details to load')
    return false
  }

  return true
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

    // Wait for any pending concept detail loads before converting to Atlas format
    const allDetailsLoaded = await checkAndWaitForConceptDetails()
    if (!allDetailsLoaded) {
      console.error('Some concept details failed to load. Proceeding with save anyway.')
      // You could show a warning to the user here if desired
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

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    console.log(`${label} copied to clipboard`)
  } catch (error) {
    console.error(`Error copying ${label} to clipboard:`, error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    console.log(`${label} copied to clipboard (fallback method)`)
  }
}

// Fetch cohort generation info from WebAPI
const fetchCohortInfo = async (cohortDefinitionId: number) => {
  try {
    isLoadingCohortInfo.value = true
    console.log('Fetching cohort info for cohort definition ID:', cohortDefinitionId)
    // Use selected dataset from dropdown in Atlas mode, or portal dataset in portal mode
    const datasetId = isAtlas.value ? selectedDatasetForGeneration.value : getDatasetId()
    if (!datasetId) {
      console.error('Missing datasetId for fetching cohort info')
      return
    }
    const info = await d2eWebapiService.getCohortInfo(cohortDefinitionId, datasetId)
    cohortInfo.value = info
    console.log('Fetched cohort info:', info)

    // Update patient count based on selected dataset
    updatePatientCountFromInfo()
  } catch (error) {
    console.error('Error fetching cohort info:', error)
    cohortInfo.value = []
    patientCount.value = null
  } finally {
    isLoadingCohortInfo.value = false
  }
}

// Update patient count based on selected dataset and available cohort info
const updatePatientCountFromInfo = () => {
  // Get the sourceId for the selected dataset
  const selectedSource = availableSources.value.find(source => source.sourceKey === selectedDatasetForGeneration.value)

  if (!selectedSource) {
    patientCount.value = null
    generationStatus.value = 'idle'
    return
  }

  // Find cohort info for this source
  const infoForSource = cohortInfo.value.find(info => info.id.sourceId === selectedSource.sourceId)

  if (infoForSource && infoForSource.status === 'COMPLETE') {
    patientCount.value = infoForSource.personCount
    generationStatus.value = 'complete'
    console.log('Found patient count from cohort info:', infoForSource.personCount)
  } else {
    patientCount.value = null
    generationStatus.value = 'idle'
  }
}

// Start polling for generation status
const startPolling = (cohortDefinitionId: number, sourceId: number) => {
  console.log('Starting polling for cohort generation', { cohortDefinitionId, sourceId })
  generationStatus.value = 'pending'

  // Clear any existing polling interval
  stopPolling()

  // Start new polling interval
  pollingInterval = setInterval(async () => {
    try {
      const notifications = await d2eWebapiService.getNotifications()
      console.log('Polling notifications:', notifications)

      // Find notification for this cohort and source
      const relevantNotification = notifications.find(
        (n: Notification) =>
          n.jobParameters.cohort_definition_id === cohortDefinitionId.toString() &&
          n.jobParameters.source_id === sourceId.toString() &&
          n.jobInstance.name === 'generateCohort'
      )

      if (relevantNotification) {
        console.log('Found relevant notification:', relevantNotification)

        if (relevantNotification.status === 'COMPLETED') {
          console.log('Generation completed, fetching cohort info')
          generationStatus.value = 'complete'

          // Fetch updated cohort info to get patient count
          await fetchCohortInfo(cohortDefinitionId)

          // Stop polling
          stopPolling()
          isGeneratingCohort.value = false
        } else if (relevantNotification.status === 'STARTED') {
          console.log('Generation still in progress')
          generationStatus.value = 'pending'
        } else {
          // Unknown status - treat as potentially failed
          console.log('Unknown generation status:', relevantNotification.status)
          generationStatus.value = 'failed'
          patientCount.value = null
          stopPolling()
          isGeneratingCohort.value = false
        }
      }
    } catch (error) {
      console.error('Error polling notifications:', error)
    }
  }, POLLING_INTERVAL_MS)
}

// Stop polling
const stopPolling = () => {
  if (pollingInterval) {
    console.log('Stopping polling')
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

// Cleanup on component unmount
onBeforeUnmount(() => {
  stopPolling()
})

// Action bar methods
const generateCohort = async () => {
  try {
    isGeneratingCohort.value = true
    patientCount.value = null
    generationStatus.value = 'pending'

    // Get the active bookmark
    const activeBookmark = store?.getters?.getActiveBookmark
    if (!activeBookmark?.bmkId) {
      return
    }

    const atlasDefinitionId = parseInt(activeBookmark.bmkId)
    // Use selected source in Atlas mode, or portal datasetId in portal mode
    const datasetId = isAtlas.value ? selectedDatasetForGeneration.value : getDatasetId()

    // Get the sourceId for polling
    const selectedSource = availableSources.value.find(source => source.sourceKey === datasetId)
    if (!selectedSource) {
      console.error('Could not find source for dataset:', datasetId)
      return
    }

    // Call the same API endpoint as AddCohort component
    await store.dispatch('fireCreateAtlasMaterializedCohortQuery', {
      url: `/d2e-webapi/cohortdefinition/${atlasDefinitionId}/generate/${datasetId}`,
    })

    // Start polling to track generation progress
    startPolling(atlasDefinitionId, selectedSource.sourceId)
  } catch (error) {
    console.error('Error generating cohort:', error)
    patientCount.value = null
    generationStatus.value = 'failed'
    isGeneratingCohort.value = false
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
        <!-- Left: Cohort Name -->
        <div class="header-section-left">
          <div class="cohort-name-display">
            <span class="cohort-name-label">Cohort Name:</span>
            <span class="cohort-name-value">{{ displayCohortName }}</span>
          </div>
        </div>

        <!-- Middle: Generate Cohort Controls -->
        <div class="header-section-middle">
          <div class="generate-cohort-controls">
            <div v-if="isAtlas" class="dataset-selector">
              <select v-model="selectedDatasetForGeneration" class="dataset-dropdown" :disabled="isGeneratingCohort">
                <option v-for="source in availableSources" :key="source.sourceKey" :value="source.sourceKey">
                  {{ source.sourceName }}
                </option>
              </select>
            </div>

            <button @click="generateCohort" :disabled="isGeneratingCohort" class="btn btn-primary generate-cohort-btn">
              <GenerateCohortActiveIcon class="btn-icon" />
              {{ isGeneratingCohort ? 'Generating...' : 'Generate Cohort' }}
            </button>

            <div class="patient-count-display">
              <span class="patient-count-label">Patient Count:</span>
              <span class="patient-count-value">{{ displayPatientCount }}</span>
            </div>
          </div>
        </div>

        <!-- Right: Save -->
        <div class="header-section-right">
          <div class="right-button-group">
            <ButtonMaterial @button-click="openSaveDialog" :disabled="!isReadyToSave">
              {{ isReadyToSave ? 'Save' : 'Loading...' }}
            </ButtonMaterial>
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
            @search-change="handleSearchChange"
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
            @search-change="handleSearchChange"
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
            @search-change="handleSearchChange"
            @concept-set-action="handleConceptSetAction"
            @update-fixed-duration="handleUpdateFixedDuration"
            @update-cont-drug-settings="handleUpdateContDrugSettings"
          />
        </div>
      </div>
    </div>

    <!-- Debug Toggle -->
    <div class="debug-toggle-section" v-if="debug">
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
      <button class="btn btn-secondary" @click="clearFilters">Clear All</button>
    </div>

    <!-- Debug Output -->
    <div v-if="showDebug" class="query-filter-debug">
      <h3>Debug Information</h3>
      <div class="debug-columns">
        <div class="debug-column">
          <div class="debug-column-header">
            <h4>Hierarchical Criteria JSON:</h4>
            <button
              class="btn btn-sm btn-outline-primary copy-button"
              @click="copyToClipboard(JSON.stringify(getAllFilters(), null, 2), 'Hierarchical Criteria JSON')"
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
          </div>
          <pre>{{ JSON.stringify(getAllFilters(), null, 2) }}</pre>
        </div>

        <div class="debug-column">
          <div class="debug-column-header">
            <h4>Atlas JSON:</h4>
            <button
              class="btn btn-sm btn-outline-primary copy-button"
              @click="copyToClipboard(JSON.stringify(convertToAtlasFormat(), null, 2), 'Atlas JSON')"
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
          </div>
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
                      v-bind="maxLength !== undefined ? { maxlength: maxLength } : {}"
                    />
                    <div class="invalid-feedback" :style="isInvalidName ? 'display: block' : ''">
                      Please enter a valid name
                    </div>
                    <div
                      v-if="maxLength !== undefined"
                      class="invalid-feedback"
                      :style="hasExceededLength ? 'display: block' : ''"
                    >
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
          :tooltip="!isReadyToSave ? saveDisabledReason : getText('MRI_PA_BUTTON_SAVE') || 'Save'"
          :disabled="hasExceededLength || !cohortName.trim() || !isReadyToSave"
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
