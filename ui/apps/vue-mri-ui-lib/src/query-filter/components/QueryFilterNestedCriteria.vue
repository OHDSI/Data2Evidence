<script lang="ts">
export default {
  name: 'QueryFilterNestedCriteria',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import QueryFilterCard from './QueryFilterCard.vue'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'

interface NestedCriteria {
  id: string
  criteriaType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  events: any[]
}

interface Props {
  nestedCriteria: NestedCriteria
  level?: number
  maxDepth?: number
  conceptSets?: ConceptSetItem[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  readonly?: boolean
  hideHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  maxDepth: 10,
  conceptSets: () => [],
  readonly: false,
  hideHeader: false,
})

const emit = defineEmits<{
  'update:nestedCriteria': [criteria: NestedCriteria]
  'remove-nested': []
}>()

// Local reactive copy of nested criteria
const localCriteria = ref<NestedCriteria>({ ...props.nestedCriteria })

// Computed for two-way binding
const criteriaData = computed({
  get: () => localCriteria.value,
  set: (value: NestedCriteria) => {
    localCriteria.value = value
    emit('update:nestedCriteria', value)
  },
})

// Check if we've reached maximum nesting depth
const isMaxDepthReached = computed(() => props.level >= props.maxDepth)

// Get events that have nested attributes
const eventsWithNesting = computed(() => {
  return criteriaData.value.events.filter(event =>
    event.attributes?.some((attr: any) => attr.attributeType === 'nested')
  )
})

// Get nested criteria from an event's attributes
const getNestedCriteriaFromEvent = (event: any) => {
  const nestedAttribute = event.attributes?.find((attr: any) => attr.attributeType === 'nested')
  return nestedAttribute?.nestedCriteria
}

// Handle criteria type changes
const updateCriteriaType = (newType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST') => {
  criteriaData.value = {
    ...criteriaData.value,
    criteriaType: newType,
  }
}

// Handle adding new event to nested criteria
const addNestedEvent = () => {
  const newEvent = {
    id: `nested_event_${Date.now()}`,
    eventType: 'conditionOccurrence',
    isExpanded: true,
    attributes: [],
    cardinality: {
      type: 'AT_LEAST',
      count: 1,
      using: 'ALL',
    },
  }

  criteriaData.value = {
    ...criteriaData.value,
    events: [...criteriaData.value.events, newEvent],
  }
}

// Handle removing nested criteria
const removeNested = () => {
  if (confirm('Are you sure you want to remove this nested criteria?')) {
    emit('remove-nested')
  }
}

// Create temporary filter for backward compatibility with QueryFilterCard
const createTempFilterForEvent = (event: any) => ({
  id: `temp_${event.id}`,
  title: 'Nested Event',
  type: 'inclusion' as const,
  events: [event],
  isExpanded: true,
})

// Handle event updates from QueryFilterCard
const handleEventUpdate = (eventIndex: number, updatedFilter: any) => {
  if (updatedFilter.events && updatedFilter.events[0]) {
    const newEvents = [...criteriaData.value.events]
    newEvents[eventIndex] = updatedFilter.events[0]

    criteriaData.value = {
      ...criteriaData.value,
      events: newEvents,
    }
  }
}

// Handle event removal
const handleEventRemove = (eventIndex: number) => {
  const newEvents = criteriaData.value.events.filter((_, index) => index !== eventIndex)

  criteriaData.value = {
    ...criteriaData.value,
    events: newEvents,
  }
}

// Get visual indicators for nesting level
const getNestingStyle = computed(() => ({
  marginLeft: `${props.level * 20}px`,
  borderLeft: `3px solid ${getNestingColor()}`,
  backgroundColor: props.level > 0 ? `rgba(25, 118, 210, ${0.05 + props.level * 0.02})` : 'transparent',
}))

const getNestingColor = () => {
  const colors = ['#1976d2', '#7b1fa2', '#388e3c', '#f57c00', '#d32f2f']
  return colors[props.level % colors.length]
}

// Get operator display text
const getOperatorText = (operator: string) => {
  switch (operator) {
    case 'ALL':
      return 'ALL'
    case 'ANY':
      return 'ANY'
    case 'AT_LEAST':
      return 'AT LEAST'
    case 'AT_MOST':
      return 'AT MOST'
    default:
      return operator
  }
}
</script>

<template>
  <div
    class="query-filter-nested-criteria"
    :class="`query-filter-nested-criteria--level-${level}`"
    :style="getNestingStyle"
  >
    <!-- Nested Criteria Header -->
    <div v-if="!hideHeader" class="nested-header">
      <div class="nested-header__left">
        <span class="nested-indicator">
          {{ '└─'.repeat(level + 1) }}
        </span>
        <span class="nested-label"> Nested Criteria (Level {{ level + 1 }}) </span>
      </div>

      <div class="nested-header__controls">
        <div class="nested-operator-container">
          <label class="nested-operator-label">Match:</label>
          <select
            v-if="!readonly"
            v-model="localCriteria.criteriaType"
            class="nested-operator-select"
            @change="updateCriteriaType($event.target.value as any)"
          >
            <option value="ALL">ALL</option>
            <option value="ANY">ANY</option>
            <option value="AT_LEAST">AT LEAST</option>
            <option value="AT_MOST">AT MOST</option>
          </select>
          <span v-else class="nested-operator-readonly">
            {{ getOperatorText(localCriteria.criteriaType) }}
          </span>
        </div>

        <button
          v-if="!readonly && level > 0"
          class="btn-remove-nested"
          @click="removeNested"
          title="Remove nested criteria"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Nested Events -->
    <div class="nested-events">
      <div v-if="criteriaData.events.length === 0" class="nested-empty-state">
        <p class="empty-message">No events in this nested criteria</p>
        <button v-if="!readonly" class="btn-add-nested-event" @click="addNestedEvent">+ Add Event</button>
      </div>

      <div v-else class="nested-events-list">
        <!-- Render each event using QueryFilterCard for compatibility -->
        <div v-for="(event, eventIndex) in criteriaData.events" :key="event.id" class="nested-event-item">
          <QueryFilterCard
            :filter="createTempFilterForEvent(event)"
            :hide-group-label="true"
            :show-add-event-in-any="false"
            :concept-sets="conceptSets"
            :concept-set-domain-values="conceptSetDomainValues"
            :concept-set-texts="conceptSetTexts"
            :nested-level="level + 1"
            @update:filter="handleEventUpdate(eventIndex, $event)"
            @remove-filter="handleEventRemove(eventIndex)"
          />

          <!-- Recursive nested criteria if this event has nested attributes -->
          <QueryFilterNestedCriteria
            v-if="!isMaxDepthReached && getNestedCriteriaFromEvent(event)"
            :nested-criteria="getNestedCriteriaFromEvent(event)"
            :level="level + 1"
            :max-depth="maxDepth"
            :concept-sets="conceptSets"
            :concept-set-domain-values="conceptSetDomainValues"
            :concept-set-texts="conceptSetTexts"
            :readonly="readonly"
            @update:nested-criteria="
              updated => {
                const attr = event.attributes.find(a => a.attributeType === 'nested')
                if (attr) attr.nestedCriteria = updated
              }
            "
          />
        </div>
      </div>
    </div>

    <!-- Add Event Button -->
    <div v-if="!readonly && criteriaData.events.length > 0" class="nested-actions">
      <button class="btn-add-nested-event" @click="addNestedEvent">+ Add Event to Nested Criteria</button>
    </div>

    <!-- Depth Warning -->
    <div v-if="level >= maxDepth - 1" class="depth-warning">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text"> Maximum nesting depth reached. Further nesting is not allowed. </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-nested-criteria {
  border-radius: 6px;
  margin: 8px 0;
  padding: 12px;
  transition: all 0.2s ease;

  // Level-specific styling
  &--level-0 {
    border: 1px solid #e0e0e0;
  }

  &--level-1 {
    border: 1px solid #7b1fa2;
    background-color: rgba(123, 31, 162, 0.02);
  }

  &--level-2 {
    border: 1px solid #388e3c;
    background-color: rgba(56, 142, 60, 0.02);
  }

  .nested-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);

    &__left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  .nested-indicator {
    font-family: monospace;
    color: #666;
    font-size: 14px;
    font-weight: bold;
  }

  .nested-label {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .nested-operator-container {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .nested-operator-label {
    font-size: 12px;
    color: #666;
    font-weight: 500;
  }

  .nested-operator-select {
    padding: 4px 8px;
    border: 1px solid #d0d0d0;
    border-radius: 3px;
    font-size: 12px;
    color: #333;
    background: #fff;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .nested-operator-readonly {
    font-size: 12px;
    color: #333;
    font-weight: 500;
  }

  .btn-remove-nested {
    width: 24px;
    height: 24px;
    border: 1px solid #d0d0d0;
    background: #fff;
    border-radius: 3px;
    color: #666;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      border-color: #dc3545;
      color: #dc3545;
      background: #fff5f5;
    }
  }

  .nested-events {
    margin-bottom: 8px;
  }

  .nested-empty-state {
    text-align: center;
    padding: 20px;
    border: 1px dashed #d0d0d0;
    border-radius: 4px;
    background: #fafafa;

    .empty-message {
      margin: 0 0 12px 0;
      font-size: 13px;
      color: #666;
      font-style: italic;
    }
  }

  .nested-events-list {
    .nested-event-item {
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .btn-add-nested-event {
    padding: 6px 12px;
    border: 1px dashed #1976d2;
    background: transparent;
    color: #1976d2;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(25, 118, 210, 0.1);
      border-style: solid;
    }
  }

  .nested-actions {
    display: flex;
    justify-content: center;
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
  }

  .depth-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    margin-top: 8px;

    .warning-icon {
      font-size: 16px;
    }

    .warning-text {
      font-size: 12px;
      color: #856404;
      font-weight: 500;
    }
  }
}
</style>
