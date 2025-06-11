<script lang="ts">
export default {
  name: 'QueryFilterDemo',
}
</script>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import QueryFilterCard from './QueryFilterCard.vue'
import CriteriaSelectorDropdown from './CriteriaSelectorDropdown.vue'
import { QueryFilterCardModel, QueryFilterEvent, QueryFilterChip, QueryFilterManager } from '../models/QueryFilterModel'
import { type CriteriaOption } from '../utils/CriteriaConfigLoader'

const activeTab = ref('all')
const showDebug = ref(false)
const filterManager = reactive(new QueryFilterManager())

// Initialize with sample data
const initializeSampleData = () => {
  // Sample inclusion filters matching the screenshot
  const diabetesFilter = new QueryFilterCardModel({
    title: 'Diabetes Type 2',
    type: 'inclusion',
    events: [
      {
        id: 'event1',
        conceptSet: 'Event concept set',
        chips: [{ id: 'chip1', label: 'Diabetes Type 2', value: 'E11' }],
      },
    ],
  })

  const cardiovascularFilter = new QueryFilterCardModel({
    title: 'Cardiovascular disease',
    type: 'inclusion',
    operator: 'OR', // Set to OR so we can see the ANY sidebar
    events: [
      {
        id: 'event2',
        conceptSet: 'Event concept set',
        chips: [{ id: 'chip2', label: 'Atrial Fib A', value: 'I48.0' }],
      },
      {
        id: 'event3',
        conceptSet: 'Event concept set',
        chips: [{ id: 'chip3', label: 'Atrial Fib B', value: 'I48.1' }],
      },
    ],
  })

  // Expand both filters by default
  diabetesFilter.isExpanded = true
  cardiovascularFilter.isExpanded = true

  filterManager.addFilter(diabetesFilter)
  filterManager.addFilter(cardiovascularFilter)
}

// Initialize sample data on mount
onMounted(() => {
  initializeSampleData()
})

const inclusionFilters = computed(() => filterManager.getInclusionFilters())
const exclusionFilters = computed(() => filterManager.getExclusionFilters())

const updateFilter = (filter: QueryFilterCardModel) => {
  // In a real app, this would update the store
  console.log('Filter updated:', filter)
}

// Handle criteria selection for new filters
const handleCriteriaSelected = (option: CriteriaOption) => {
  console.log('Selected criteria:', option)
  
  const newFilter = new QueryFilterCardModel({
    title: option.title.replace('Add ', ''), // Remove "Add" prefix for title
    type: 'inclusion',
    events: [{
      id: `event_${Date.now()}`,
      conceptSet: `${option.title.replace('Add ', '')} concept set`,
      chips: [],
      criteriaType: option.id, // Store the criteria type for attributes
    }],
  })
  
  // Expand the new filter by default
  newFilter.isExpanded = true
  filterManager.addFilter(newFilter)
}

const addInclusionFilter = () => {
  const newFilter = new QueryFilterCardModel({
    title: 'New Inclusion Filter',
    type: 'inclusion',
    events: [],
  })
  filterManager.addFilter(newFilter)
}

const handleAddEvent = (filterId: string, eventId?: string) => {
  // Only handle this for main filter actions, not for nested events
  if (eventId) {
    // This is a nested event being added - ignore it since it's handled internally
    return
  }
  
  const filter = filterManager.getFilter(filterId)
  if (filter) {
    const newEvent: QueryFilterEvent = {
      id: `event_${Date.now()}`,
      conceptSet: 'Event concept set',
      chips: [],
      criteriaType: 'conditionOccurrence', // Default to condition occurrence
      selectedAttributes: []
    }
    filter.addEvent(newEvent)
  }
}

// Handle criteria selection for existing filters (add event to filter)
const handleCriteriaSelectedForFilter = (filterId: string, option: CriteriaOption) => {
  const filter = filterManager.getFilter(filterId)
  if (filter) {
    const newEvent: QueryFilterEvent = {
      id: `event_${Date.now()}`,
      conceptSet: `${option.title.replace('Add ', '')} concept set`,
      chips: [],
      criteriaType: option.id,
      selectedAttributes: []
    }
    filter.addEvent(newEvent)
  }
}

const handleEditEvent = (filterId: string, eventId: string) => {
  console.log('Edit event:', filterId, eventId)
  // Would open edit dialog
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
  // Would open chip selection dialog
  // For demo, add a sample chip
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
  // Would show context menu
}

const handleAttributeSelected = (filterId: string, eventId: string, attribute: any) => {
  console.log('Attribute selected:', filterId, eventId, attribute)
}

const handleAttributeRemoved = (filterId: string, eventId: string, attributeId: string) => {
  console.log('Attribute removed:', filterId, eventId, attributeId)
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
  // In real app, would download as file
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
</script>

<template>
  <div class="query-filter-demo">
    <!-- Filter Container -->
    <div class="query-filter-container">
      <!-- Inclusion Criteria Section -->
      <div class="query-filter-container__section">
        <div class="query-filter-container__header">
          <h3 class="query-filter-container__section-title">Inclusion Criterias</h3>

          <!-- Tab Navigation -->
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

        <!-- ALL 9 Container -->
        <div class="query-filter-group">
          <div class="query-filter-group__sidebar">
            <span class="sidebar-label">ALL 9</span>
          </div>

          <div class="query-filter-group__content">
            <!-- Criteria selector for adding new sections -->
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
            />
          </div>
        </div>
      </div>

      <!-- Removed exclusion criteria section as requested -->
    </div>

    <!-- Action Buttons -->
    <div class="query-filter-demo__actions">
      <button class="btn btn-primary" @click="applyFilters">Apply Filters</button>
      <button class="btn btn-secondary" @click="clearFilters">Clear All</button>
      <button class="btn btn-link" @click="exportFilters">Export Configuration</button>
    </div>

    <!-- Debug Output -->
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
