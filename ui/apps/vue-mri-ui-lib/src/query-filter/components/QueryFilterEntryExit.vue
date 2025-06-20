<script lang="ts">
export default {
  name: 'QueryFilterEntryExit',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'
import QueryFilterEventContainer from './QueryFilterEventContainer.vue'
import GroupButtons from './GroupButtons.vue'
import { ref } from 'vue'
import ObservationPeriodBlock from './ObservationPeriodBlock.vue'

interface Props {
  type: 'ENTRY' | 'EXIT'
  criteriaData?: any
  conceptSets?: ConceptSetItem[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  criteriaData: () => ({ criteriaType: 'ALL', criteria: [] }),
  conceptSets: () => [],
  readonly: false,
})

const emit = defineEmits<{
  'update:criteria': [criteria: any]
  'criteria-updated': [criteriaManager: QueryFilterCriteriaManager]
  'update-qualifying-limit': [limit: 'ALL' | 'EARLIEST' | 'LATEST']
  'add-criteria-group': [groupData: any]
  'update-criteria-group': [index: number, groupData: any]
  'remove-criteria-group': [index: number]
}>()

const title = computed(() => (props.type === 'ENTRY' ? 'Cohort Entry Events' : 'Cohort Exit'))
// Get current criteria data (now from props instead of criteriaManager)
const currentCriteriaData = computed(() => props.criteriaData)

// Handle qualifying events limit selection
const updateQualifyingLimit = (limit: 'ALL' | 'EARLIEST' | 'LATEST') => {
  emit('update-qualifying-limit', limit)
}

// Handle adding new criteria group
const addNewGroup = () => {
  const newGroup = {
    id: `criteria_${Date.now()}`,
    title: `Criteria ${currentCriteriaData.value.criteria.length + 1}`,
    description: `Description for Criteria ${currentCriteriaData.value.criteria.length + 1}`,
    criteriaType: 'ALL' as 'ALL',
    events: [],
  }

  emit('add-criteria-group', newGroup)
}

// Handle group updates
const handleGroupUpdate = (groupIndex: number, updatedGroup: any) => {
  emit('update-criteria-group', groupIndex, updatedGroup)
}

// Handle group removal
const handleGroupRemove = (groupIndex: number) => {
  emit('remove-criteria-group', groupIndex)
}

const initialEventsLimitOptions = [
  { value: 'EARLIEST', label: 'Earliest' },
  { value: 'ALL', label: 'All' },
  { value: 'LATEST', label: 'Latest' },
]

const exitEventPersistenceOptions = [
  { value: 'CONT_OBS', label: 'Continuous observation' },
  { value: 'FIXED', label: 'Fixed duration to initial event' },
  { value: 'CONT_DRUG', label: 'Continuous drug exposure' },
]

const buttonOptions = computed(() => {
  return props.type === 'ENTRY' ? initialEventsLimitOptions : exitEventPersistenceOptions
})

const isEntry = computed(() => props.type === 'ENTRY')

const initialEventsLimit = ref('')
</script>

<template>
  <div class="query-filter-entry-exit">
    <div class="criteria-header">
      <div class="criteria-title-container">
        <h3 class="criteria-title">{{ title }}</h3>
      </div>

      <div class="qualifying-events-controls">
        <GroupButtons :options="buttonOptions" :small="!isEntry" :model-value="initialEventsLimit" />
      </div>

      <div class="shadow-container">
        <ObservationPeriodBlock v-if="isEntry" />
      </div>
    </div>

    <div class="events-container">
      <div class="sidebar">ALL</div>
      <QueryFilterEventContainer
        :criteria-data="currentCriteriaData"
        :concept-sets="props.conceptSets"
        :concept-set-domain-values="props.conceptSetDomainValues"
        :concept-set-texts="props.conceptSetTexts"
        :readonly="readonly"
        @update:criteria="emit('update:criteria', $event)"
        @criteria-updated="emit('criteria-updated', $event)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-entry-exit {
  .criteria-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    // margin-bottom: 16px;
    // padding-bottom: 16px;
    border-bottom: 1px solid #e0e0e0;
    position: relative;
    padding: 16px;

    .criteria-title-container,
    .shadow-container {
      flex: 1;
    }
    .qualifying-events-controls {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }

  .criteria-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fe5e59;
  }

  .obs-period {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #000080;
  }

  .events-container {
    display: flex;
    min-height: 100px;
    .sidebar {
      width: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 6px;
      background: #000080; // Blue to match other sidebars
      position: relative;
      border-radius: 0 0 0 8px;
      color: white;
      writing-mode: sideways-lr;
    }
    .query-filter-event-container {
      flex: 1;
      padding: 16px;
    }
  }

  .qualifying-events-btn {
    flex: 1;
    padding: 8px 12px;
    border: none;
    background: transparent;
    border-radius: 6px;
    &:not(:first-child) {
      border-left: #000080 2px solid;
    }
    font-size: 14px;
    font-weight: 600;
    color: #000080;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    z-index: 2;
    text-align: center;
    white-space: nowrap;

    &:hover:not(:disabled):not(.qualifying-events-btn--active) {
      background: rgba(30, 58, 138, 0.05);
    }

    &--active {
      background: #000080;
      color: white;
      box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);
    }

    &--readonly {
      cursor: not-allowed;
      opacity: 0.6;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    // Remove border radius for middle button
    &:not(:first-child):not(:last-child) {
      border-radius: 0;
    }

    // First button - rounded left only
    &:first-child {
      border-radius: 6px 0 0 6px;
    }

    // Last button - rounded right only
    &:last-child {
      border-radius: 0 6px 6px 0;
    }

    // If only one button (shouldn't happen but just in case)
    &:only-child {
      border-radius: 6px;
    }
  }

  .criteria-groups-layout {
    display: flex;
  }

  .criteria-groups-sidebar {
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 6px;
    background: #000080; // Blue to match other sidebars
    position: relative;
    border-radius: 8px 0 0 8px; // Round left corners

    // Add subtle border to indicate different states
    &::after {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: rgba(255, 255, 255, 0.3);
    }
  }

  .criteria-sidebar-label {
    writing-mode: sideways-lr;
    text-orientation: sideways;
    font-size: 13px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    user-select: none;
  }

  .criteria-groups-content {
    flex: 1;
    padding: 0 0 0 4px; // Add left padding for spacing from sidebar
  }

  .criteria-groups-layout {
    margin-bottom: 8px;
  }

  .add-group-container {
    display: flex;
    justify-content: center;
    padding: 8px 0;
  }

  .btn-add-group {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 2px dashed #d0d0d0;
    background: transparent;
    border-radius: 8px;
    color: #666;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1976d2;
      color: #1976d2;
      background: rgba(25, 118, 210, 0.04);
    }

    &__icon {
      font-size: 18px;
      font-weight: 600;
    }

    &__text {
      font-weight: 500;
    }
  }
}
</style>

