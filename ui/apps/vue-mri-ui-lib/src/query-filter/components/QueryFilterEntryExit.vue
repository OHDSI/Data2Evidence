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
import { EntryEvent, ExitEvent, QueryFilterCriteriaManager, QueryFilterEvent } from '../models/QueryFilterModel'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'
import QueryFilterEventContainer from './QueryFilterEventContainer.vue'
import GroupButtons from './GroupButtons.vue'
import ObservationPeriodBlock from './ObservationPeriodBlock.vue'

interface Props {
  type: 'ENTRY' | 'EXIT'
  primaryEventsData?: EntryEvent
  exitCriteriaData?: ExitEvent
  conceptSets?: ConceptSetItem[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  conceptSets: () => [],
  readonly: false,
})

const emit = defineEmits<{
  'update-limit': [limit: 'ALL' | 'EARLIEST' | 'LATEST' | 'CONT_OBS' | 'FIXED' | 'CONT_DRUG']
  'update-entry-days': [type: 'PRIOR' | 'POST', days: number]
}>()

const title = computed(() => (props.type === 'ENTRY' ? 'Cohort Entry Events' : 'Cohort Exit'))

const updateLimitValue = (limit: 'ALL' | 'EARLIEST' | 'LATEST' | 'CONT_OBS' | 'FIXED' | 'CONT_DRUG') => {
  emit('update-limit', limit)
}
const updateEntryDaysValue = (type: 'PRIOR' | 'POST', days: number) => {
  emit('update-entry-days', type, days)
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

const initialEventsLimit = computed(() => {
  if (isEntry.value) {
    return props.primaryEventsData?.primaryCriteriaLimit || 'ALL'
  } else {
    return props.exitCriteriaData?.endStrategy || 'CONT_OBS'
  }
})

const priorDays = computed(() => {
  return (isEntry.value && props.primaryEventsData?.priorDays) || 0
})

const postDays = computed(() => {
  return (isEntry.value && props.primaryEventsData?.postDays) || 0
})

const eventsData = computed(() => {
  return isEntry.value ? props.primaryEventsData?.events || [] : props.exitCriteriaData?.censoringCriteria || []
})

const handleEventsUpdate = (updatedEvents: QueryFilterEvent[]) => {
  if (isEntry.value) {
    props.primaryEventsData.events = [...updatedEvents]
  } else {
    props.exitCriteriaData.censoringCriteria = [...updatedEvents]
  }
}
</script>

<template>
  <div class="query-filter-entry-exit">
    <div class="criteria-header">
      <div class="criteria-title-container">
        <h3 class="criteria-title">{{ title }}</h3>
      </div>

      <div class="qualifying-events-controls">
        <GroupButtons
          :options="buttonOptions"
          :small="!isEntry"
          :limitValue="initialEventsLimit"
          :namePrefix="type.toLowerCase()"
          @update-limit-value="updateLimitValue"
        />
      </div>

      <div class="shadow-container">
        <ObservationPeriodBlock
          v-if="isEntry"
          :priorDays="priorDays"
          :postDays="postDays"
          @update-entry-days="updateEntryDaysValue"
        />
      </div>
    </div>

    <div class="events-container">
      <div class="sidebar">ALL</div>
      <QueryFilterEventContainer
        :events="eventsData"
        :event-type="type"
        :concept-sets="props.conceptSets"
        :concept-set-domain-values="props.conceptSetDomainValues"
        :concept-set-texts="props.conceptSetTexts"
        :readonly="readonly"
        @update-events="handleEventsUpdate"
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
      padding: 8px 16px;
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
