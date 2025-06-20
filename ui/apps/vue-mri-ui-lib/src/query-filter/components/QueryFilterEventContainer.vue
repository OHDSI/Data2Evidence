<script lang="ts">
export default {
  name: 'QueryFilterEventContainer',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import QueryFilterEventCard from './QueryFilterEventCard.vue'
import CriteriaSelectorDropdown from './CriteriaSelectorDropdown.vue'
import type { QueryFilterEvent, QueryFilterGroup } from '../models/QueryFilterModel'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'
import type { CriteriaOption } from '../utils/CriteriaConfigLoader'

interface Props {
  events: QueryFilterEvent[]
  parentGroup: QueryFilterGroup
  conceptSets?: ConceptSetItem[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  events: () => [],
  conceptSets: () => [],
  readonly: false,
})

const emit = defineEmits<{
  'update-events': [events: QueryFilterEvent[]]
  'event-updated': [eventIndex: number, event: QueryFilterEvent]
  'event-removed': [eventIndex: number]
}>()

// Local events array
const localEvents = ref<QueryFilterEvent[]>([...props.events])

// Sync with props when they change
const eventsData = computed({
  get: () => localEvents.value,
  set: (value: QueryFilterEvent[]) => {
    localEvents.value = value
    emit('update-events', value)
  },
})

// Handle adding new event from criteria selector
const handleCriteriaSelected = (option: CriteriaOption) => {
  const newEvent: QueryFilterEvent = {
    id: `event_${Date.now()}`,
    conceptSet: `${option.title.replace('Add ', '')} concept set`,
    criteriaType: option.id,
    isExpanded: true,
    selectedAttributes: [],
    isAttributeBased: false,
    isDemographic: false,
    isNested: false,
    nestedEvents: [],
    nestedOperator: 'AND',
    conceptSetDetails: [],
    conceptSetLoading: false,
    cardinality: {
      type: 'AT_LEAST',
      count: 1,
      using: 'ALL',
    },
  }

  eventsData.value = [...eventsData.value, newEvent]
}

// Handle manual add event
const addNewEvent = () => {
  const newEvent: QueryFilterEvent = {
    id: `event_${Date.now()}`,
    conceptSet: 'New Event',
    criteriaType: 'conditionOccurrence',
    isExpanded: true,
    selectedAttributes: [],
    isAttributeBased: false,
    isDemographic: false,
    isNested: false,
    nestedEvents: [],
    nestedOperator: 'AND',
    conceptSetDetails: [],
    conceptSetLoading: false,
    cardinality: {
      type: 'AT_LEAST',
      count: 1,
      using: 'ALL',
    },
  }

  eventsData.value = [...eventsData.value, newEvent]
}

// Handle event updates
const updateEvent = (eventIndex: number, updatedEvent: QueryFilterEvent) => {
  const newEvents = [...eventsData.value]
  newEvents[eventIndex] = updatedEvent
  eventsData.value = newEvents
  emit('event-updated', eventIndex, updatedEvent)
}

// Handle event removal
const removeEvent = (eventIndex: number) => {
  const newEvents = eventsData.value.filter((_, index) => index !== eventIndex)
  eventsData.value = newEvents
  emit('event-removed', eventIndex)
}

// Handle event duplication
const duplicateEvent = (eventIndex: number) => {
  const originalEvent = eventsData.value[eventIndex]
  if (originalEvent) {
    const duplicatedEvent: QueryFilterEvent = {
      ...originalEvent,
      id: `event_${Date.now()}`,
      conceptSet: `${originalEvent.conceptSet} (Copy)`,
    }

    const newEvents = [...eventsData.value]
    newEvents.splice(eventIndex + 1, 0, duplicatedEvent)
    eventsData.value = newEvents
  }
}

// Event handlers for new QueryFilterEventCard component
const handleAttributeSelected = (eventId: string, attribute: any) => {
  console.log('Attribute selected:', eventId, attribute)
}

const handleAttributeRemoved = (eventId: string, attributeId: string) => {
  console.log('Attribute removed:', eventId, attributeId)
}

const handleConceptSetSelected = (eventId: string, conceptSet: ConceptSetItem) => {
  const eventIndex = eventsData.value.findIndex(e => e.id === eventId)
  if (eventIndex !== -1) {
    const updatedEvent = {
      ...eventsData.value[eventIndex],
      selectedConceptSet: conceptSet,
      conceptSetId: conceptSet.value,
      conceptSet: conceptSet.text || conceptSet.display_value || conceptSet.value,
    }
    updateEvent(eventIndex, updatedEvent)
  }
}
</script>

<template>
  <div class="query-filter-event-container">
    <!-- Add Event Controls - positioned at top, right after group title -->
    <div v-if="!readonly" class="add-event-controls">
      <CriteriaSelectorDropdown
        section-id="initialEvents"
        button-text="+ Add event"
        @criteria-selected="handleCriteriaSelected"
      />
    </div>

    <!-- Events List -->
    <div class="events-list">
      <!-- Use new QueryFilterEventCard component for single event focus -->
      <QueryFilterEventCard
        v-for="(event, index) in eventsData"
        :key="event.id"
        :event="event"
        :event-index="index"
        :concept-sets="conceptSets"
        :concept-set-domain-values="conceptSetDomainValues"
        :concept-set-texts="conceptSetTexts"
        :readonly="readonly"
        @update:event="updateEvent(index, $event)"
        @remove-event="removeEvent(index)"
        @duplicate-event="duplicateEvent(index)"
        @concept-set-selected="handleConceptSetSelected(event.id, $event)"
        @attribute-selected="handleAttributeSelected(event.id, $event)"
        @attribute-removed="handleAttributeRemoved(event.id, $event)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-event-container {
  .add-event-controls {
    display: flex;
    gap: 8px;
    margin-top: 0;
    margin-bottom: 8px;
    padding: 0;
    background: transparent;
    border: none;
  }

  .btn-add-event-simple {
    padding: 8px 16px;
    border: 1px solid #1976d2;
    background: #fff;
    color: #1976d2;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: #1976d2;
      color: #fff;
    }
  }

  .events-list {
    .query-filter-card {
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    border: 2px dashed #d0d0d0;
    border-radius: 8px;
    background: #fafafa;

    &__content {
      text-align: center;
      max-width: 300px;
    }

    &__icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    &__title {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    &__description {
      margin: 0 0 20px 0;
      font-size: 14px;
      color: #666;
      line-height: 1.5;
    }
  }

  .btn-add-first-event {
    padding: 12px 24px;
    border: none;
    background: #1976d2;
    color: #fff;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: #1565c0;
    }
  }

  .event-relationships {
    margin-top: 16px;
    padding: 12px;
    background: #e3f2fd;
    border-radius: 6px;
    border-left: 4px solid #1976d2;
  }

  .relationship-indicator {
    .relationship-text {
      font-size: 13px;
      color: #1565c0;

      strong {
        font-weight: 600;
      }
    }
  }
}
</style>
