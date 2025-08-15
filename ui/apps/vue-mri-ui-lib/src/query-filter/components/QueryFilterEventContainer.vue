<script lang="ts">
export default {
  name: 'QueryFilterEventContainer',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import QueryFilterEventCard from './QueryFilterEventCard.vue'
import QueryFilterNestedCriteria, { type NestedCriteria } from './QueryFilterNestedCriteria.vue'
import CriteriaSelectorDropdown from './CriteriaSelectorDropdown.vue'
import type { QueryFilterEvent, QueryFilterGroup } from '../types/QueryFilterTypes'
import type {
  ConceptSetItemDisplay,
  ConceptSetDomainValues,
  ConceptSetAction,
  SelectedConceptSet,
} from '../types/ConceptSetTypes'
import type { CriteriaOption } from '../utils/CriteriaConfigLoader'

interface Props {
  events: QueryFilterEvent[]
  eventType?: 'ENTRY' | 'EXIT' | 'CRITERIA'
  parentGroup?: QueryFilterGroup
  conceptSets?: ConceptSetItemDisplay[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  datasetId?: string | null
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
  'concept-set-action': [action: ConceptSetAction]
}>()

// Work directly with props.events for reactivity
const eventsData = computed({
  get: () => props.events,
  set: (value: QueryFilterEvent[]) => {
    emit('update-events', value)
  },
})

const mainEvents = computed(() => eventsData.value)

// Determine the correct section ID based on event type
const sectionId = computed(() => {
  if (props.eventType === 'EXIT') {
    return 'censoringEvents'
  } else if (props.eventType === 'CRITERIA') {
    return 'criteriaGroup'
  } else {
    // Default to initialEvents for ENTRY or undefined
    return 'initialEvents'
  }
})
// Handle adding new event from criteria selector
const handleCriteriaSelected = (option: CriteriaOption) => {
  const newEvent: QueryFilterEvent = {
    id: `event_${Date.now()}`,
    conceptSet: `${option.title.replace('Add ', '')} concept set`,
    eventType: option.id,
    isExpanded: true,
    selectedAttributes: [],
    isDemographic: false,
    conceptSetDetails: [],
    conceptSetLoading: false,
    cardinality: {
      type: 'AT_LEAST',
      count: 1,
      using: 'ALL',
    },
  }

  // Handle group events differently
  if (option.id === 'group') {
    newEvent.conceptSet = 'Group'
    newEvent.nestedCriteria = {
      id: `nested_${Date.now()}`,
      criteriaType: 'ALL',
      events: [],
    }
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

const handleConceptSetSelected = (eventId: string, conceptSet: ConceptSetItemDisplay | null) => {
  const eventIndex = eventsData.value.findIndex(e => e.id === eventId)
  if (eventIndex !== -1) {
    const currentEvent = eventsData.value[eventIndex]
    if (!currentEvent) return

    if (!conceptSet) {
      // Handle concept set removal
      const updatedEvent: QueryFilterEvent = {
        ...currentEvent,
        selectedConceptSet: undefined,
        conceptSetId: undefined,
        conceptSet: '',
      }
      updateEvent(eventIndex, updatedEvent)
      return
    }

    const selectedConceptSet: SelectedConceptSet = {
      value: parseInt(conceptSet.value),
      text: conceptSet.text || '',
      display_value: conceptSet.display_value || '',
      conceptIds: conceptSet.conceptIds || [],
      concepts:
        conceptSet.concepts?.map(c => ({
          id: c.id || c.concept_id || 0,
          useMapped: c.useMapped || false,
          isExcluded: c.isExcluded || false,
          useDescendants: c.useDescendants || false,
        })) || [],
      shared: false,
      userName: '',
      createdDate: '',
      modifiedDate: '',
    }

    const updatedEvent: QueryFilterEvent = {
      ...currentEvent,
      conceptSet: conceptSet.text || conceptSet.display_value || conceptSet.value,
      selectedConceptSet,
      conceptSetId: conceptSet.value,
    }
    updateEvent(eventIndex, updatedEvent)
  }
}

// Handle nested criteria updates for group events
const updateEventNestedCriteria = (eventId: string, nestedCriteria: NestedCriteria) => {
  const eventIndex = eventsData.value.findIndex(e => e.id === eventId)
  if (eventIndex !== -1) {
    const currentEvent = eventsData.value[eventIndex]
    if (!currentEvent) return

    const updatedEvent: QueryFilterEvent = {
      ...currentEvent,
      nestedCriteria,
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
        :section-id="sectionId"
        button-text="+ Add event"
        @criteria-selected="handleCriteriaSelected"
      />
    </div>

    <!-- Events List -->
    <div class="events-list">
      <template v-for="(event, index) in mainEvents" :key="event.id">
        <!-- Render QueryFilterNestedCriteria for group events -->
        <QueryFilterNestedCriteria
          v-if="event.eventType === 'group'"
          :nested-criteria="event.nestedCriteria || { id: event.id, criteriaType: 'ALL', events: [] }"
          :concept-sets="conceptSets"
          :concept-set-domain-values="
            conceptSetDomainValues || { values: [], isLoading: false, loadedStatus: 'NO_RESULTS' }
          "
          :concept-set-texts="conceptSetTexts || {}"
          :dataset-id="datasetId || null"
          :readonly="readonly"
          :hide-header="false"
          @update:nested-criteria="criteria => updateEventNestedCriteria(event.id, criteria)"
          @concept-set-action="(action: ConceptSetAction) => $emit('concept-set-action', action)"
        />

        <!-- Use QueryFilterEventCard for regular events -->
        <QueryFilterEventCard
          v-else
          :event="event"
          :event-index="index"
          :all-events="eventsData"
          :concept-sets="conceptSets"
          :concept-set-domain-values="
            conceptSetDomainValues || { values: [], isLoading: false, loadedStatus: 'NO_RESULTS' }
          "
          :concept-set-texts="conceptSetTexts || {}"
          :dataset-id="datasetId || null"
          :readonly="readonly"
          @update:event="
            updateEvent(
              mainEvents.findIndex(e => e.id === event.id),
              $event
            )
          "
          @remove-event="removeEvent(mainEvents.findIndex(e => e.id === event.id))"
          @duplicate-event="duplicateEvent(mainEvents.findIndex(e => e.id === event.id))"
          @concept-set-selected="handleConceptSetSelected(event.id, $event)"
          @attribute-selected="handleAttributeSelected(event.id, $event)"
          @attribute-removed="handleAttributeRemoved(event.id, $event)"
          @concept-set-action="(action: ConceptSetAction) => $emit('concept-set-action', action)"
        />
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-event-container {
  .add-event-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;
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
