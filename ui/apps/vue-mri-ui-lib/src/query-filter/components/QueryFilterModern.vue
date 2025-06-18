<script lang="ts">
export default {
  name: 'QueryFilterModern',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance, watch, nextTick } from 'vue'
import QueryFilterCriteria from './QueryFilterCriteria.vue'
import { QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import { convertAtlasToFilters } from '../utils/AtlasConverter'
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
  useNewHierarchy?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  debug: true,
  useNewHierarchy: true,
})

// Use the new hierarchical criteria manager instead of the old filter manager
const criteriaManager = new QueryFilterCriteriaManager()
const instance = getCurrentInstance()
const store = instance?.appContext.config.globalProperties.$store

// Maintain backward compatibility with existing tag input model
const tagInputModel = computed<TagInputModel>(() => ({
  id: 'concept-set-test',
  props: {
    type: 'conceptSet',
    value: selectedConceptSetValues.value,
    attributePath: 'condition_occurrence.concept_id',
    domainFilter: 'Condition',
    standardConceptCodeFilter: 'Standard',
  },
}))

const selectedConceptSets = ref<ConceptSetItem[]>([])

// Computed property to extract concept sets from loaded criteria
const conceptSetsFromCriteria = computed(() => {
  const conceptSets: ConceptSetItem[] = []
  const seenIds = new Set<string>()

  const criteria = criteriaManager.getCriteria()
  criteria.criteria.forEach(group => {
    group.groups.forEach(filter => {
      filter.events.forEach(event => {
        if (event.conceptSetId && !seenIds.has(event.conceptSetId)) {
          // Look up the concept set by ID in allConceptSets
          const foundConceptSet = allConceptSets.value.find(cs => cs.value === event.conceptSetId)
          if (foundConceptSet) {
            conceptSets.push(foundConceptSet)
            seenIds.add(event.conceptSetId)
          } else if (event.selectedConceptSet) {
            // Fallback to selectedConceptSet if lookup fails
            conceptSets.push(event.selectedConceptSet)
            seenIds.add(event.conceptSetId)
          }
        }
      })
    })
  })

  return conceptSets
})

const conceptSetDetails = ref<ConceptSetDetails>({})
const loadingConceptDetails = ref(false)

const tagInputTexts = getTagInputTexts()

const allConceptSets = ref<ConceptSetItem[]>([])
const conceptSetDomainValues = ref<ConceptSetDomainValues>(createDefaultConceptSetDomainValues())

const getDatasetIdFromStore = (): string | null => {
  // Try to get datasetId from the store or a fixed value for now
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
  // selectedConceptSets is kept in sync with conceptSetsFromCriteria via watcher
  return selectedConceptSets.value
})

const initializeSampleData = () => {
  // Clear the criteria manager instead of filters
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
  initializeSampleData()
  console.log('Loading initial concept sets...')
  loadConceptSets()
})

// Handle criteria updates from the new component hierarchy
const handleCriteriaUpdated = (updatedCriteriaManager: QueryFilterCriteriaManager) => {
  // The criteria manager is reactive, so updates are automatic
  console.log('Criteria updated:', updatedCriteriaManager.toJSON())
}

// Note: handleCriteriaSelected removed - not needed in modern component

const applyFilters = () => {
  console.log('Applying filters:', getAllFilters())
  alert('Filters applied! Check console for configuration.')
}

const clearFilters = () => {
  if (confirm('Are you sure you want to clear all filters?')) {
    criteriaManager.clearAllCriteria()
    selectedConceptSets.value = []
  }
}

const exportFilters = () => {
  const config = JSON.stringify(getAllFilters(), null, 2)
  console.log('Exported configuration:', config)
}

const getAllFilters = () => {
  return criteriaManager.toJSON()
}

const convertToAtlasFormat = () => {
  return criteriaManager.convertToAtlasFormat()
}

// Convert Atlas JSON to the new hierarchical format
const convertAtlasToFiltersLocal = (atlasJson: any) => {
  // For now, use the existing conversion and then transform to hierarchical format
  const legacyFilters = convertAtlasToFilters(atlasJson, allConceptSets.value)

  // Transform legacy filters to hierarchical criteria
  const hierarchicalData = {
    entryEvents: {},
    inclusionCriteria: {
      qualifyingEventsLimit: 'ALL',
      criteria: legacyFilters.map((filter, index) => ({
        id: filter.id,
        title: filter.title || `Criteria ${index + 1}`,
        description: '',
        criteriaType: 'ALL',
        events: filter.events.map(event => ({
          id: event.id,
          eventType: event.criteriaType || 'conditionOccurrence',
          isExpanded: true,
          attributes: event.attributes || [],
          cardinality: event.cardinality || {
            type: 'AT_LEAST',
            count: 1,
            using: 'ALL',
          },
          conceptSetId: event.conceptSetId,
          selectedConceptSet: event.selectedConceptSet,
          conceptSet: event.conceptSet,
        })),
      })),
    },
  }

  return new QueryFilterCriteriaManager(hierarchicalData)
}

const loadAtlasCohortDefinition = async (atlasJson: any) => {
  try {
    console.log('Loading Atlas cohort definition:', atlasJson?.name || 'Unnamed cohort')
    console.log('Available concept sets:', allConceptSets.value.length)

    // Clear existing criteria
    criteriaManager.clearAllCriteria()

    // Convert Atlas JSON to hierarchical criteria
    const newCriteriaManager = convertAtlasToFiltersLocal(atlasJson)

    // Copy the criteria to our reactive manager
    const criteriaData = newCriteriaManager.getCriteria()
    criteriaManager.setCriteria(criteriaData)

    console.log('Successfully loaded Atlas cohort definition into QueryFilterModern')

    // Force reactivity update
    await nextTick()

    // Load concept set details for events that have selectedConceptSet
    setTimeout(async () => {
      const criteria = criteriaManager.getCriteria()
      for (const group of criteria.criteria) {
        for (const filter of group.groups) {
          for (const event of filter.events) {
            if (event.selectedConceptSet && event.conceptSetId) {
              try {
                const conceptSetDetails = await loadSingleConceptSetDetails(event.selectedConceptSet)
                event.conceptSetDetails = conceptSetDetails
                event.conceptSetLoading = false
              } catch (error) {
                console.warn(`Failed to load concept set details for event ${event.id}:`, error)
              }
            }
          }
        }
      }
    }, 200)
  } catch (error) {
    console.error('Error loading Atlas cohort definition:', error)
    throw error
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

// Handle concept set updates
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

// Expose functions so parent components can access them
defineExpose({
  convertToAtlasFormat,
  loadAtlasCohortDefinition,
})
</script>

<template>
  <div class="query-filter-modern">
    <!-- Main Query Filter Content -->
    <div class="query-filter-container">
      <!-- New Hierarchical Component Structure -->
      <div v-if="useNewHierarchy" class="query-filter-container__section">
        <QueryFilterCriteria
          :criteria-manager="criteriaManager"
          :concept-sets="allConceptSets"
          :concept-set-domain-values="conceptSetDomainValues"
          :concept-set-texts="tagInputTexts"
          @criteria-updated="handleCriteriaUpdated"
          @update:criteria="handleCriteriaUpdated"
        />
      </div>

      <!-- Legacy support section for backward compatibility -->
      <div v-else class="query-filter-legacy-section">
        <div class="legacy-notice">
          <p>
            Using legacy flat structure. Set <code>useNewHierarchy: true</code> to use the new hierarchical components.
          </p>
        </div>
      </div>
    </div>

    <!-- Debug Tag Input Section -->
    <div v-if="props.debug" class="query-filter-debug-section">
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
          <strong>Debug:</strong> Model ID: {{ tagInputModel.id }}, Type: {{ tagInputModel.props.type }}, Value length:
          {{ tagInputModel.props.value.length }}
        </div>
      </div>
    </div>

    <!-- Concept Set Details Debug Section -->
    <div v-if="props.debug && selectedConceptSetValues.length > 0" class="concept-set-debug">
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
    <div v-if="props.debug" class="query-filter-actions">
      <button class="btn btn-primary" @click="applyFilters">Apply Filters</button>
      <button class="btn btn-secondary" @click="clearFilters">Clear All</button>
      <button class="btn btn-link" @click="exportFilters">Export Configuration</button>
    </div>

    <!-- Debug Output -->
    <div v-if="props.debug" class="query-filter-debug">
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
  </div>
</template>

<style lang="scss" scoped>
.query-filter-modern {
  .query-filter-debug-header {
    margin-bottom: 24px;
    padding: 16px;
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

  .query-filter-container {
    &__section {
      margin-bottom: 24px;
    }
  }

  .query-filter-legacy-section {
    .legacy-notice {
      padding: 16px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
      margin-bottom: 24px;

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
    margin-bottom: 24px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .concept-set-debug {
    margin-bottom: 24px;
  }

  .query-filter-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    padding: 16px;
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
    padding: 16px;
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
