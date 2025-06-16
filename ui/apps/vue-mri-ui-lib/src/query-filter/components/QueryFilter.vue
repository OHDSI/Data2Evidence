<script lang="ts">
export default {
  name: 'QueryFilter',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, getCurrentInstance, watch } from 'vue'
import QueryFilterCard from './QueryFilterCard.vue'
import CriteriaSelectorDropdown from './CriteriaSelectorDropdown.vue'
import { QueryFilterCardModel, QueryFilterEvent, QueryFilterChip, QueryFilterManager } from '../models/QueryFilterModel'
import { type CriteriaOption } from '../utils/CriteriaConfigLoader'
import QueryFilterTagInputAdapter from '../../lib/ui/QueryFilterTagInputAdapter.vue'
import type {
  ConceptSetItem,
  ConceptSetDomainValues,
  TagInputModel,
  ConceptSetAction,
  ConceptSetDetails,
} from '../types/ConceptSetTypes'
import {
  loadConceptSets as apiLoadConceptSets,
  loadConceptSetDetails as apiLoadConceptSetDetails,
  loadSingleConceptSetDetails as apiLoadSingleConceptSetDetails,
} from '../services/ConceptSetApiService'
import { filterConceptSets, getTagInputTexts, createDefaultConceptSetDomainValues } from '../utils/ConceptSetHelpers'

interface Props {
  debug?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  debug: false,
})

const activeTab = ref<'earliest' | 'all' | 'latest'>('all')
const showDebug = ref(false)
const filterManager = reactive(new QueryFilterManager())

const instance = getCurrentInstance()
const store = instance?.appContext.config.globalProperties.$store

const tagInputModel = ref<TagInputModel>({
  id: 'concept-set-test',
  props: {
    type: 'conceptSet',
    value: [],
    attributePath: 'condition_occurrence.concept_id',
    domainFilter: 'Condition',
    standardConceptCodeFilter: 'Standard',
  },
})

const selectedConceptSets = ref<ConceptSetItem[]>([])

const conceptSetDetails = ref<ConceptSetDetails>({})
const loadingConceptDetails = ref(false)

const tagInputTexts = getTagInputTexts()

const allConceptSets = ref<ConceptSetItem[]>([])
const conceptSetDomainValues = ref<ConceptSetDomainValues>(createDefaultConceptSetDomainValues())

const getDatasetIdFromStore = (): string | null => {
  // Try to get datasetId from the store or a fixed value for now
  // You may need to adjust this based on how datasetId is stored in your store
  return store?.state?.selectedDataset?.id || '4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e'
}

const loadConceptSets = async () => {
  const datasetId = getDatasetIdFromStore()
  if (!datasetId) {
    console.warn('Missing datasetId for concept set API call')
    return
  }

  conceptSetDomainValues.value.isLoading = true

  try {
    const result = await apiLoadConceptSets(datasetId)
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

  const datasetId = getDatasetIdFromStore()
  if (!datasetId) {
    console.warn('Missing datasetId for concept details API call')
    return
  }

  loadingConceptDetails.value = true

  try {
    const result = await apiLoadConceptSetDetails(selectedConceptSets, datasetId)
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

const tagInputDomainValues = computed(() => conceptSetDomainValues.value)

const selectedConceptSetValues = computed(() => {
  return selectedConceptSets.value
})

const initializeSampleData = () => {
  filterManager.clearAllFilters()
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

onMounted(() => {
  initializeSampleData()

  loadConceptSets()
})

const inclusionFilters = computed(() => filterManager.getInclusionFilters())

// This function is a placeholder for filter updates, as the reactive refs handle updates automatically. No value is needed here.
const updateFilter = (_filter: QueryFilterCardModel) => {
  // Filter updates are handled automatically through reactive refs
}

const handleCriteriaSelected = (option: CriteriaOption) => {
  const newFilter = new QueryFilterCardModel({
    title: option.title.replace('Add ', ''),
    type: 'inclusion',
    events: [
      {
        id: `event_${Date.now()}`,
        conceptSet: `${option.title.replace('Add ', '')} concept set`,
        chips: [],
        criteriaType: option.id,
      },
    ],
  })

  newFilter.isExpanded = true
  filterManager.addFilter(newFilter)
}

const handleAddEvent = (filterId: string, eventId?: string) => {
  if (eventId) {
    return
  }

  const filter = filterManager.getFilter(filterId)
  if (filter) {
    const newEvent: QueryFilterEvent = {
      id: `event_${Date.now()}`,
      conceptSet: 'Event concept set',
      chips: [],
      criteriaType: 'conditionOccurrence',
      selectedAttributes: [],
    }
    filter.addEvent(newEvent)
  }
}

const handleEditEvent = (filterId: string, eventId: string) => {
  console.log('Edit event:', filterId, eventId)
}

const handleDuplicateEvent = (filterId: string, eventId: string) => {
  const filter = filterManager.getFilter(filterId)
  if (filter) {
    const event = filter.events.find(e => e.id === eventId)
    if (event) {
      const duplicated: QueryFilterEvent = {
        id: `event_${Date.now()}`,
        conceptSet: event.conceptSet,
        chips: event.chips.map(chip => ({
          ...chip,
          id: `chip_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        })),
      }
      filter.addEvent(duplicated)
    }
  }
}

const handleRemoveEvent = (filterId: string, eventId: string) => {
  const filter = filterManager.getFilter(filterId)
  if (filter) {
    filter.removeEvent(eventId)
  }
}

const handleAddChip = (filterId: string, eventId: string) => {
  console.log('Add chip to event:', filterId, eventId)
  const filter = filterManager.getFilter(filterId)
  if (filter) {
    const sampleChip: QueryFilterChip = {
      id: `chip_${Date.now()}`,
      label: 'New Event',
      value: 'NEW001',
    }
    filter.addChipToEvent(eventId, sampleChip)
  }
}

const handleRemoveChip = (filterId: string, eventId: string, chipId: string) => {
  console.log('Chip removed:', filterId, eventId, chipId)
}

const handleShowMenu = (filterId: string, eventId: string) => {
  console.log('Show menu for event:', filterId, eventId)
}

const handleAttributeSelected = (filterId: string, eventId: string, attribute: any) => {
  console.log('Attribute selected:', filterId, eventId, attribute)
}

const handleAttributeRemoved = (filterId: string, eventId: string, attributeId: string) => {
  console.log('Attribute removed:', filterId, eventId, attributeId)
}

const handleEventConceptSetSelected = async (filterId: string, eventId: string, conceptSet: ConceptSetItem) => {
  console.log('Event concept set selected:', filterId, eventId, conceptSet)

  const filter = filterManager.getFilter(filterId)
  if (!filter) return

  const event = filter.getEvent(eventId)
  if (!event) return

  event.selectedConceptSet = conceptSet
  event.conceptSetId = conceptSet.value
  event.conceptSet = conceptSet.text || conceptSet.display_value || conceptSet.value
  event.conceptSetLoading = true

  try {
    const conceptSetDetails = await loadSingleConceptSetDetails(conceptSet)
    event.conceptSetDetails = conceptSetDetails
    event.conceptSetLoading = false

    console.log(`Updated event ${eventId} with concept set details:`, conceptSetDetails)
  } catch (error) {
    console.error('Error loading concept set details for event:', error)
    event.conceptSetLoading = false
  }
}

const loadSingleConceptSetDetails = async (conceptSet: ConceptSetItem) => {
  const datasetId = getDatasetIdFromStore()
  if (!datasetId) {
    console.warn('Missing datasetId for concept details API call')
    return []
  }

  try {
    return await apiLoadSingleConceptSetDetails(conceptSet, datasetId)
  } catch (error) {
    console.error('Error loading single concept set details:', error)
    return []
  }
}

const applyFilters = () => {
  console.log('Applying filters:', getAllFilters())
  alert('Filters applied! Check console for configuration.')
}

const clearFilters = () => {
  if (confirm('Are you sure you want to clear all filters?')) {
    filterManager.clearAllFilters()
  }
}

const exportFilters = () => {
  const config = JSON.stringify(getAllFilters(), null, 2)
  console.log('Exported configuration:', config)
  showDebug.value = !showDebug.value
}

const getAllFilters = () => {
  return filterManager.getAllFilters().map(f => f.toJSON())
}

const convertToAtlasFormat = () => {
  return filterManager.convertToAtlasFormat(activeTab.value)
}

// Expose the convertToAtlasFormat function so parent components can access it
defineExpose({
  convertToAtlasFormat,
})

const handleRemoveFilter = (filterId: string) => {
  const removed = filterManager.removeFilter(filterId)
  if (removed) {
    console.log('Filter removed:', filterId)
  }
}

const handleConceptSetUpdate = (value: ConceptSetItem[]) => {
  try {
    if (Array.isArray(value) && selectedConceptSets) {
      selectedConceptSets.value = [...value]
      console.log('Concept set updated (stored locally):', value)
    } else {
      console.warn('Invalid value passed to handleConceptSetUpdate:', value)
    }
  } catch (error) {
    console.error('Error in handleConceptSetUpdate:', error)
    if (selectedConceptSets && Array.isArray(value)) {
      selectedConceptSets.value = value
    }
  }
}

const handleSearchChange = (searchQuery: string) => {
  console.log('Search query changed:', searchQuery)

  filterConceptSetsLocal(searchQuery)
}

const handleConceptSetAction = ({ values, config }: ConceptSetAction) => {
  console.log('Concept set action:', values, config)

  const datasetId = getDatasetIdFromStore()
  const conceptSetId = values?.value

  const domainFilter = tagInputModel.value.props.domainFilter
  const standardConceptCodeFilter = tagInputModel.value.props.standardConceptCodeFilter

  const defaultFilters = [
    { id: 'domainId', value: domainFilter ? [domainFilter] : [] },
    { id: 'concept', value: standardConceptCodeFilter ? [standardConceptCodeFilter] : [] },
  ]

  const handleCloseCallback = async (onCloseValues: any) => {
    if (!onCloseValues?.currentConceptSet) {
      return
    }

    const conceptSetIdToFind = onCloseValues.currentConceptSet.id

    try {
      // Reload all concept sets to get complete data with concepts and flags
      await loadConceptSets()

      // Find the concept set with complete data from the fresh API response
      const completeConceptSet = allConceptSets.value.find((cs: ConceptSetItem) => cs.value == conceptSetIdToFind)

      if (completeConceptSet) {
        // Use complete concept set data if found
        if (conceptSetId) {
          // Updating existing concept set
          console.log('Updating concept set:', completeConceptSet.text)
          const currentSets = selectedConceptSets.value
          const index = currentSets.findIndex((cs: ConceptSetItem) => cs.value === conceptSetId)
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
      } else {
        // Fallback to basic data if concept set not found in reloaded data
        console.warn(`Could not find concept set with ID ${conceptSetIdToFind} after reloading, using basic data`)
      }
    } catch (error) {
      console.error('Error reloading concept sets after terminology update:', error)
      // Fallback to basic data if reload fails
      if (conceptSetId) {
        const currentSets = selectedConceptSets.value
        const index = currentSets.findIndex((cs: ConceptSetItem) => cs.value === conceptSetId)
        if (index !== -1) {
          const updatedSets = [...currentSets]
          updatedSets[index] = {
            ...updatedSets[index],
            text: onCloseValues.currentConceptSet.name,
            display_value: onCloseValues.currentConceptSet.name,
          }
          selectedConceptSets.value = updatedSets
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
      }
    }
  }

  const event = new CustomEvent('alp-terminology-open', {
    detail: {
      props: {
        selectedDatasetId: datasetId,
        selectedConceptSetId: conceptSetId,
        mode: 'CONCEPT_SET',
        onClose: handleCloseCallback,
        defaultFilters,
      },
    },
  })

  window.dispatchEvent(event)
}
</script>

<template>
  <div class="query-filter-demo">
    <div class="query-filter-container">
      <div class="query-filter-container__section">
        <div class="query-filter-container__header">
          <h3 class="query-filter-container__section-title">Inclusion Criteria</h3>

          <div class="query-filter-tabs">
            <button
              class="query-filter-tabs__tab query-filter-tabs__tab--earliest"
              :class="{ active: activeTab === 'earliest' }"
              @click="activeTab = 'earliest'"
            >
              Earliest
            </button>
            <button
              class="query-filter-tabs__tab query-filter-tabs__tab--all"
              :class="{ active: activeTab === 'all' }"
              @click="activeTab = 'all'"
            >
              All
            </button>
            <button
              class="query-filter-tabs__tab query-filter-tabs__tab--latest"
              :class="{ active: activeTab === 'latest' }"
              @click="activeTab = 'latest'"
            >
              Latest
            </button>
          </div>
        </div>

        <div class="query-filter-group">
          <div class="query-filter-group__sidebar">
            <span class="sidebar-label">ALL</span>
          </div>
          <div v-if="props.debug" style="padding: 16px">
            <div style="margin-bottom: 16px">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px">
                Event Concept Set:
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
              v-if="props.debug"
              style="
                margin-top: 8px;
                padding: 8px;
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                font-size: 12px;
              "
            >
              <strong>Debug:</strong> Model ID: {{ tagInputModel.id }}, Type: {{ tagInputModel.props.type }}, Value
              length: {{ tagInputModel.props.value.length }}
            </div>

            <div
              v-if="props.debug && selectedConceptSetValues.length > 0"
              style="
                margin-top: 16px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #e0e0e0;
              "
            >
              <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #333">
                Selected Concept Set Values:
              </h4>
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
              <pre
                style="
                  margin-top: 8px;
                  font-size: 11px;
                  color: #666;
                  background: white;
                  padding: 8px;
                  border-radius: 4px;
                  overflow-x: auto;
                "
                >{{ JSON.stringify(selectedConceptSetValues, null, 2) }}</pre
              >
            </div>

            <div
              v-if="props.debug && selectedConceptSetValues.length > 0"
              style="
                margin-top: 16px;
                padding: 12px;
                background: #f0f8ff;
                border-radius: 6px;
                border: 1px solid #b3d9ff;
              "
            >
              <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #333">
                Concept Set Details (Atlas Format):
              </h4>
              <div style="font-size: 11px; color: #666; margin-bottom: 8px; font-style: italic">
                Fetches concept details via API and formats for Atlas compatibility
              </div>

              <div v-if="loadingConceptDetails" style="color: #666; font-style: italic">
                Fetching concept details...
              </div>

              <div v-else-if="Object.keys(conceptSetDetails).length === 0" style="color: #666; font-style: italic">
                No concept details loaded yet. Select a concept set to view concept details.
              </div>

              <div v-else>
                <div
                  v-for="(concepts, conceptSetId) in conceptSetDetails"
                  :key="conceptSetId"
                  style="margin-bottom: 12px"
                >
                  <h5 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #0066cc">
                    Concept Set ID: {{ conceptSetId }}
                    <span
                      v-if="selectedConceptSetValues.find(cs => cs.value == conceptSetId)"
                      style="color: #666; font-weight: normal"
                    >
                      ({{ selectedConceptSetValues.find(cs => cs.value == conceptSetId)?.text }})
                    </span>
                  </h5>

                  <div v-if="Array.isArray(concepts) && (concepts as any[]).length > 0">
                    <div
                      v-for="(conceptItem, idx) in (concepts as any[]).slice(0, 10)"
                      :key="idx"
                      style="
                        background: white;
                        margin: 4px 0;
                        padding: 8px;
                        border-radius: 4px;
                        border-left: 4px solid #0066cc;
                        font-size: 11px;
                      "
                    >
                      <div style="font-weight: 600; margin-bottom: 4px">
                        {{ conceptItem?.concept?.CONCEPT_NAME || 'Unknown Concept' }}
                      </div>
                      <div style="color: #666; margin-bottom: 4px">
                        <strong>Code:</strong> {{ conceptItem?.concept?.CONCEPT_CODE || 'N/A' }} | <strong>ID:</strong>
                        {{ conceptItem?.concept?.CONCEPT_ID || 'N/A' }} | <strong>Domain:</strong>
                        {{ conceptItem?.concept?.DOMAIN_ID || 'N/A' }}
                      </div>
                      <div style="color: #666; margin-bottom: 4px">
                        <strong>Vocabulary:</strong> {{ conceptItem?.concept?.VOCABULARY_ID || 'N/A' }} |
                        <strong>Class:</strong> {{ conceptItem?.concept?.CONCEPT_CLASS_ID || 'N/A' }} |
                        <strong>Standard:</strong> {{ conceptItem?.concept?.STANDARD_CONCEPT_CAPTION || 'N/A' }}
                      </div>
                      <div style="color: #0066cc; font-size: 10px">
                        <strong>Atlas Properties:</strong>
                        Excluded: {{ conceptItem?.isExcluded ? 'Yes' : 'No' }} | Include Descendants:
                        {{ conceptItem?.includeDescendants ? 'Yes' : 'No' }} | Include Mapped:
                        {{ conceptItem?.includeMapped ? 'Yes' : 'No' }}
                      </div>
                    </div>
                    <div
                      v-if="(concepts as any[]).length > 10"
                      style="color: #666; font-style: italic; font-size: 11px"
                    >
                      ... and {{ (concepts as any[]).length - 10 }} more concepts (showing first 10 of
                      {{ (concepts as any[]).length }} fetched)
                    </div>
                    <div
                      v-if="(concepts as any[]).length === 20"
                      style="color: #ff6600; font-style: italic; font-size: 11px; margin-top: 4px"
                    >
                      Note: Limited to first 20 concepts
                    </div>
                  </div>

                  <div v-else style="color: #666; font-style: italic; font-size: 11px">
                    No concepts found for this concept set
                  </div>
                </div>
              </div>

              <details style="margin-top: 8px">
                <summary style="cursor: pointer; font-size: 11px; color: #666">Show raw concept details JSON</summary>
                <pre
                  style="
                    margin-top: 4px;
                    font-size: 10px;
                    color: #666;
                    background: white;
                    padding: 8px;
                    border-radius: 4px;
                    overflow-x: auto;
                    max-height: 200px;
                    overflow-y: auto;
                  "
                  >{{ JSON.stringify(conceptSetDetails, null, 2) }}</pre
                >
              </details>
            </div>
            <div
              v-else-if="!props.debug"
              style="
                margin-top: 16px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #e0e0e0;
                color: #666;
                font-size: 13px;
              "
            >
              No concept set values selected yet. Click the "+" button or start typing to add concepts.
            </div>
          </div>
          <div class="query-filter-group__content">
            <div class="add-section-container">
              <criteria-selector-dropdown
                section-id="initialEvents"
                button-text="Add event"
                @criteria-selected="handleCriteriaSelected"
              />
            </div>

            <query-filter-card
              v-for="filter in inclusionFilters"
              :key="filter.id"
              :filter="filter"
              :hide-group-label="true"
              :show-add-event-in-any="true"
              :concept-sets="allConceptSets"
              :concept-set-domain-values="conceptSetDomainValues"
              :concept-set-texts="tagInputTexts"
              @update:filter="updateFilter"
              @add-event="handleAddEvent(filter.id)"
              @edit-event="handleEditEvent"
              @duplicate-event="handleDuplicateEvent"
              @remove-event="handleRemoveEvent"
              @add-chip="handleAddChip"
              @remove-chip="handleRemoveChip"
              @show-menu="handleShowMenu"
              @remove-filter="handleRemoveFilter"
              @add-any-event="handleAddEvent(filter.id)"
              @attribute-selected="handleAttributeSelected"
              @attribute-removed="handleAttributeRemoved"
              @concept-set-selected="handleEventConceptSetSelected"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="props.debug" class="query-filter-demo__actions">
      <button class="btn btn-primary" @click="applyFilters">Apply Filters</button>
      <button class="btn btn-secondary" @click="clearFilters">Clear All</button>
      <button class="btn btn-link" @click="exportFilters">Export Configuration</button>
    </div>

    <div v-if="props.debug" class="query-filter-demo__debug" v-show="showDebug">
      <h3>Debug Information</h3>
      <div class="debug-columns">
        <div class="debug-column">
          <h4>UI State JSON:</h4>
          <pre>{{ JSON.stringify(getAllFilters(), null, 2) }}</pre>
        </div>

        <div class="debug-column">
          <h4>Atlas JSON:</h4>
          <pre>{{ JSON.stringify(convertToAtlasFormat(), null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../styles/QueryFilter';
</style>
