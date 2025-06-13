<script lang="ts">
export default {
  name: 'QueryFilterDemo',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, getCurrentInstance, watch } from 'vue'
import axios from 'axios'
import QueryFilterCard from './QueryFilterCard.vue'
import CriteriaSelectorDropdown from './CriteriaSelectorDropdown.vue'
import { QueryFilterCardModel, QueryFilterEvent, QueryFilterChip, QueryFilterManager } from '../models/QueryFilterModel'
import { type CriteriaOption } from '../utils/CriteriaConfigLoader'
import QueryFilterTagInputAdapter from '../../lib/ui/QueryFilterTagInputAdapter.vue'
import { getPortalAPI } from '../../utils/PortalUtils'
import type {
  ConceptSetItem,
  ConceptItem,
  ConceptDetail,
  ApiConfig,
  ConceptSetDomainValues,
  TagInputModel,
  ConceptSetAction,
  ConceptSetDetails,
} from '../types/ConceptSetTypes'

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

const tagInputTexts = {
  placeholder: 'Select concepts or type to search...',
  enterSearchTerm: 'Enter search term',
  clearAll: 'Clear All',
  createConceptSet: 'Create concept set',
  loadingSuggestions: 'Loading suggestions...',
  tooManyValues: 'Too many values',
  noSuggestions: 'No suggestions found',
}

const allConceptSets = ref<ConceptSetItem[]>([])
const conceptSetDomainValues = ref<ConceptSetDomainValues>({
  values: [],
  isLoading: false,
  loadedStatus: 'NO_RESULTS',
})

const getApiConfig = (): ApiConfig | null => {
  if (!store) return null

  const mriConfig = store.getters.getMriConfig
  const selectedDataset = store.getters.getSelectedDataset

  return {
    configId: mriConfig?.meta?.configId,
    configVersion: mriConfig?.meta?.configVersion,
    datasetId: selectedDataset?.id,
  }
}

const loadConceptSets = async () => {
  const config = getApiConfig()
  if (!config || !config.configId || !config.datasetId) {
    console.warn('Missing configuration for concept set API call')
    return
  }

  conceptSetDomainValues.value.isLoading = true

  try {
    const portalAPI = getPortalAPI()
    let headers: any = {}
    const bearerToken = portalAPI ? await portalAPI.getToken() : localStorage.getItem('msaltoken')
    if (bearerToken != null) {
      headers.Authorization = `Bearer ${bearerToken}`
    }

    if (config.datasetId) {
      headers.datasetid = config.datasetId
    }
    let url = '/analytics-svc/api/services/values'
    if (portalAPI.qeSvcUrl) {
      url = `${portalAPI.qeSvcUrl}${url}`
    } else {
      url = `${process.env.VUE_APP_HOST}${url}`
    }
    const response = await axios.get(url, {
      params: {
        attributePath: 'conceptSets',
        configId: config.configId,
        configVersion: config.configVersion,
        datasetId: config.datasetId,
        searchQuery: '',
        attributeType: 'conceptSet',
      },
      headers,
    })
    const values = response.status === 204 ? [] : response?.data?.data || []
    const formattedValues = values.map((item: any) => ({
      ...item,
      display_value: item.text || item.value,
    }))
    allConceptSets.value = formattedValues

    const loadedStatus =
      response.status === 204 ? 'TOO_MANY_RESULTS' : values.length === 0 ? 'NO_RESULTS' : 'HAS_RESULTS'

    conceptSetDomainValues.value = {
      values: formattedValues,
      isLoading: false,
      loadedStatus,
    }
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

const fetchConceptById = async (
  datasetId: string,
  conceptId: number,
  headers: Record<string, string>
): Promise<ConceptDetail | null> => {
  try {
    const portalAPI = getPortalAPI()

    let url = '/terminology/concept/searchById'
    if (portalAPI.qeSvcUrl) {
      url = `${portalAPI.qeSvcUrl}${url}`
    } else {
      url = `${process.env.VUE_APP_HOST}${url}`
    }

    const requestBody = {
      datasetId: datasetId,
      conceptId: conceptId,
    }

    const response = await axios.post(url, requestBody, { headers })
    const data = response.data
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error(`Error fetching concept by ID ${conceptId}:`, error)
    return null
  }
}

const loadConceptSetDetails = async (selectedConceptSets: ConceptSetItem[]) => {
  if (selectedConceptSets.length === 0) {
    conceptSetDetails.value = {}
    return
  }

  const config = getApiConfig()
  if (!config || !config.datasetId) {
    console.warn('Missing configuration for concept details API call')
    return
  }

  loadingConceptDetails.value = true

  try {
    const portalAPI = getPortalAPI()
    let headers: any = {
      'Content-Type': 'application/json',
    }

    // Get bearer token
    const bearerToken = portalAPI ? await portalAPI.getToken() : localStorage.getItem('msaltoken')
    if (bearerToken != null) {
      headers.Authorization = `Bearer ${bearerToken}`
    }

    // Now fetch full concept details for each concept set using their concept IDs
    const detailsMap = {}

    for (const conceptSet of selectedConceptSets) {
      const conceptSetId = conceptSet.value

      let conceptIds = []

      if (conceptSet.conceptIds && Array.isArray(conceptSet.conceptIds)) {
        conceptIds = conceptSet.conceptIds
      } else if (conceptSet.concepts && Array.isArray(conceptSet.concepts)) {
        conceptIds = conceptSet.concepts.map((c: ConceptItem) => c.id || c.concept_id || c.CONCEPT_ID).filter(Boolean)
      } else if (conceptSet.items && Array.isArray(conceptSet.items)) {
        conceptIds = conceptSet.items
          .map((item: ConceptItem) => item.id || item.concept_id || item.CONCEPT_ID)
          .filter(Boolean)
      }

      if (conceptIds.length === 0) {
        console.warn(`No concept IDs found for concept set ${conceptSetId}, using sample IDs for demo`)
        conceptIds = [201820, 4329847, 4110056, 4112183, 4151281] // Sample diabetes-related concept IDs
      }

      if (conceptIds && conceptIds.length > 0) {
        const conceptDetails = []

        const limitedConceptIds = conceptIds.slice(0, 20)
        console.log(`Fetching details for concept set ${conceptSetId}:`, limitedConceptIds)

        for (const conceptId of limitedConceptIds) {
          try {
            const conceptDetail = await fetchConceptById(config.datasetId, conceptId, headers)
            if (conceptDetail) {
              console.log(`Concept detail response for ID ${conceptId}:`, conceptDetail)

              const formattedConcept = {
                concept: {
                  CONCEPT_CLASS_ID: conceptDetail.concept_class_id,
                  CONCEPT_CODE: conceptDetail.concept_code,
                  CONCEPT_ID: conceptDetail.concept_id || conceptId,
                  CONCEPT_NAME: conceptDetail.concept_name,
                  DOMAIN_ID: conceptDetail.domain_id,
                  INVALID_REASON: conceptDetail.invalid_reason || null,
                  INVALID_REASON_CAPTION: conceptDetail.invalid_reason ? 'Invalid' : 'Valid',
                  STANDARD_CONCEPT: conceptDetail.standard_concept,
                  STANDARD_CONCEPT_CAPTION:
                    conceptDetail.standard_concept === 'S'
                      ? 'Standard'
                      : conceptDetail.standard_concept === 'C'
                      ? 'Classification'
                      : 'Non-standard',
                  VOCABULARY_ID: conceptDetail.vocabulary_id,
                  VALID_START_DATE: conceptDetail.valid_start_date || '1970-01-01',
                  VALID_END_DATE: conceptDetail.valid_end_date || '2099-12-31',
                },
                isExcluded: false,
                includeDescendants: true,
                includeMapped: true,
              }

              console.log(`Formatted concept for ID ${conceptId}:`, formattedConcept)

              conceptDetails.push(formattedConcept)
            }
          } catch (error) {
            console.warn(`Failed to fetch concept details for ID ${conceptId}:`, error)
          }
        }

        detailsMap[conceptSetId] = conceptDetails
      } else {
        detailsMap[conceptSetId] = []
      }
    }

    conceptSetDetails.value = detailsMap
    console.log('Loaded concept set details (Atlas format):', detailsMap)
  } catch (error) {
    console.error('Error loading concept set details:', error)
    conceptSetDetails.value = {}
  } finally {
    loadingConceptDetails.value = false
  }
}

const filterConceptSets = (searchQuery: string) => {
  if (!searchQuery || searchQuery.trim() === '') {
    conceptSetDomainValues.value = {
      values: allConceptSets.value,
      isLoading: false,
      loadedStatus: allConceptSets.value.length > 0 ? 'HAS_RESULTS' : 'NO_RESULTS',
    }
    return
  }
  const searchLower = searchQuery.toLowerCase()
  const filteredResults = allConceptSets.value.filter(
    (cs: ConceptSetItem) =>
      (cs.text && cs.text.toLowerCase().includes(searchLower)) ||
      (cs.display_value && cs.display_value.toLowerCase().includes(searchLower)) ||
      (cs.value && cs.value.toLowerCase().includes(searchLower))
  )

  conceptSetDomainValues.value = {
    values: filteredResults,
    isLoading: false,
    loadedStatus: filteredResults.length > 0 ? 'HAS_RESULTS' : 'NO_RESULTS',
  }
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
  event.conceptSet = conceptSet.text || conceptSet.display_value
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
  const config = getApiConfig()
  if (!config || !config.datasetId) {
    console.warn('Missing configuration for concept details API call')
    return []
  }

  try {
    const portalAPI = getPortalAPI()
    let headers: any = {
      'Content-Type': 'application/json',
    }

    // Get bearer token
    const bearerToken = portalAPI ? await portalAPI.getToken() : localStorage.getItem('msaltoken')
    if (bearerToken != null) {
      headers.Authorization = `Bearer ${bearerToken}`
    }

    // Extract concept IDs from the concept set data
    let conceptIds = []

    if (conceptSet.conceptIds && Array.isArray(conceptSet.conceptIds)) {
      conceptIds = conceptSet.conceptIds
    } else if (conceptSet.concepts && Array.isArray(conceptSet.concepts)) {
      conceptIds = conceptSet.concepts.map((c: ConceptItem) => c.id || c.concept_id || c.CONCEPT_ID).filter(Boolean)
    } else if (conceptSet.items && Array.isArray(conceptSet.items)) {
      conceptIds = conceptSet.items
        .map((item: ConceptItem) => item.id || item.concept_id || item.CONCEPT_ID)
        .filter(Boolean)
    }

    // For demo purposes, if no concept IDs found, use some sample IDs
    if (conceptIds.length === 0) {
      console.warn(`No concept IDs found for concept set ${conceptSet.value}, using sample IDs for demo`)
      conceptIds = [201820, 4329847, 4110056, 4112183, 4151281] // Sample diabetes-related concept IDs
    }

    const conceptDetails = []

    // Fetch details for each concept ID (limit to first 20 to avoid too many requests)
    const limitedConceptIds = conceptIds.slice(0, 20)
    console.log(`Fetching details for concept set ${conceptSet.value}:`, limitedConceptIds)

    for (const conceptId of limitedConceptIds) {
      try {
        const conceptDetail = await fetchConceptById(config.datasetId, conceptId, headers)
        if (conceptDetail) {
          // Format the concept detail in Atlas-compatible structure
          const formattedConcept = {
            concept: {
              CONCEPT_CLASS_ID: conceptDetail.concept_class_id,
              CONCEPT_CODE: conceptDetail.concept_code,
              CONCEPT_ID: conceptDetail.concept_id || conceptId,
              CONCEPT_NAME: conceptDetail.concept_name,
              DOMAIN_ID: conceptDetail.domain_id,
              INVALID_REASON: conceptDetail.invalid_reason || null,
              INVALID_REASON_CAPTION: conceptDetail.invalid_reason ? 'Invalid' : 'Valid',
              STANDARD_CONCEPT: conceptDetail.standard_concept,
              STANDARD_CONCEPT_CAPTION:
                conceptDetail.standard_concept === 'S'
                  ? 'Standard'
                  : conceptDetail.standard_concept === 'C'
                  ? 'Classification'
                  : 'Non-standard',
              VOCABULARY_ID: conceptDetail.vocabulary_id,
              VALID_START_DATE: conceptDetail.valid_start_date || '1970-01-01',
              VALID_END_DATE: conceptDetail.valid_end_date || '2099-12-31',
            },
            isExcluded: false,
            includeDescendants: true,
            includeMapped: true,
          }
          conceptDetails.push(formattedConcept)
        }
      } catch (error) {
        console.warn(`Failed to fetch concept details for ID ${conceptId}:`, error)
      }
    }

    return conceptDetails
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

  filterConceptSets(searchQuery)
}

const handleConceptSetAction = ({ values, config }: ConceptSetAction) => {
  console.log('Concept set action:', values, config)

  const apiConfig = getApiConfig()
  const conceptSetId = values?.value

  const domainFilter = tagInputModel.value.props.domainFilter
  const standardConceptCodeFilter = tagInputModel.value.props.standardConceptCodeFilter

  const defaultFilters = [
    { id: 'domainId', value: domainFilter ? [domainFilter] : [] },
    { id: 'concept', value: standardConceptCodeFilter ? [standardConceptCodeFilter] : [] },
  ]

  const handleCloseCallback = (onCloseValues: any) => {
    if (!onCloseValues?.currentConceptSet) {
      return
    }

    if (conceptSetId) {
      console.log('Updating concept set:', onCloseValues.currentConceptSet.name)
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
      console.log('Creating new concept set:', onCloseValues.currentConceptSet.name)
      const newConceptSet = {
        text: onCloseValues.currentConceptSet.name,
        display_value: onCloseValues.currentConceptSet.name,
        value: onCloseValues.currentConceptSet.id,
      }
      selectedConceptSets.value = [...selectedConceptSets.value, newConceptSet]
    }
  }

  const event = new CustomEvent('alp-terminology-open', {
    detail: {
      props: {
        selectedDatasetId: apiConfig?.datasetId,
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
          <div style="padding: 16px">
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
              v-if="selectedConceptSetValues.length > 0"
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
              v-if="selectedConceptSetValues.length > 0"
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
              v-else
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

    <div class="query-filter-demo__actions">
      <button class="btn btn-primary" @click="applyFilters">Apply Filters</button>
      <button class="btn btn-secondary" @click="clearFilters">Clear All</button>
      <button class="btn btn-link" @click="exportFilters">Export Configuration</button>
    </div>

    <div class="query-filter-demo__debug" v-if="showDebug">
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
@import '../styles/QueryFilterDemo';
</style>
