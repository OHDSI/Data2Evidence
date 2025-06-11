<script lang="ts">
export default {
  name: 'QueryFilterCard',
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import {
  QueryFilterCardModel,
  QueryFilterChip as QueryFilterChipType,
  QueryFilterEvent,
} from '../models/QueryFilterModel'
import QueryFilterChip from './QueryFilterChip.vue'
import QueryFilterNestedCondition from './QueryFilterNestedCondition.vue'
import AttributesDropdown from './AttributesDropdown.vue'
import CriteriaSelectorDropdown from './CriteriaSelectorDropdown.vue'
import { type AttributeConfig, type CriteriaOption } from '../utils/CriteriaConfigLoader'

const props = defineProps<{
  filter: QueryFilterCardModel
  hideGroupLabel?: boolean
  showAddEventInAny?: boolean
}>()

const emit = defineEmits([
  'update:filter',
  'add-event',
  'edit-event',
  'duplicate-event',
  'remove-event',
  'add-chip',
  'remove-chip',
  'show-menu',
  'remove-filter',
  'add-any-event',
  'attribute-selected',
  'attribute-removed',
  'toggle-nested-operator',
])

const sidebarLabel = computed(() => {
  return props.filter.type === 'inclusion' ? 'ALL 9' : 'Exclusion'
})

const toggleExpanded = () => {
  props.filter.toggle()
  emit('update:filter', props.filter)
}

const addEvent = () => {
  // Use the model's method to add a new event
  const newEvent = props.filter.addEvent({
    conceptSet: 'New Concept Set',
    chips: [],
  })
  emit('update:filter', props.filter)
  emit('add-event', props.filter.id, newEvent.id)
}

const editEvent = (eventId: string) => {
  emit('edit-event', props.filter.id, eventId)
}

const duplicateEvent = (eventId: string) => {
  const event = props.filter.getEvent(eventId)
  if (event) {
    // Create a duplicate of the event
    const duplicatedEvent = props.filter.addEvent({
      conceptSet: `${event.conceptSet} (Copy)`,
      conceptSetId: event.conceptSetId,
      chips: event.chips.map(chip => ({
        ...chip,
        id: `chip_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      })),
      operator: event.operator,
    })
    emit('update:filter', props.filter)
    emit('duplicate-event', props.filter.id, eventId, duplicatedEvent.id)
  }
}

const removeEvent = (eventId: string) => {
  const removed = props.filter.removeEvent(eventId)
  if (removed) {
    emit('update:filter', props.filter)
    emit('remove-event', props.filter.id, eventId)
  }
}

const showEventMenu = (eventId: string) => {
  emit('show-menu', props.filter.id, eventId)
}

const addChip = (eventId: string) => {
  // For now, emit to parent to handle chip selection
  // In real implementation, this would open a concept selector
  emit('add-chip', props.filter.id, eventId)
}

const removeChip = (eventId: string, chipId: string) => {
  const removed = props.filter.removeChipFromEvent(eventId, chipId)
  if (removed) {
    emit('update:filter', props.filter)
    emit('remove-chip', props.filter.id, eventId, chipId)
  }
}

const removeFilter = () => {
  emit('remove-filter', props.filter.id)
}

const toggleOperator = () => {
  props.filter.operator = props.filter.operator === 'OR' ? 'AND' : 'OR'
  emit('update:filter', props.filter)
}

// Helper to add a chip programmatically (can be called from parent)
const addChipToEvent = (eventId: string, chip: Partial<QueryFilterChipType>) => {
  const newChip: QueryFilterChipType = {
    id: chip.id || `chip_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    label: chip.label || 'New Chip',
    value: chip.value || '',
    color: chip.color,
    conceptId: chip.conceptId,
    domainId: chip.domainId,
  }

  const added = props.filter.addChipToEvent(eventId, newChip)
  if (added) {
    emit('update:filter', props.filter)
  }
  return added
}

// Handle attribute selection and removal
const handleAttributeSelected = (eventId: string, attribute: AttributeConfig & { category: string }) => {
  // Create a new attribute-based event instead of just tracking selection
  const newEvent = props.filter.addAttributeEvent(eventId, attribute)
  emit('update:filter', props.filter)
  emit('attribute-selected', props.filter.id, eventId, attribute, newEvent.id)
}

const handleAttributeRemoved = (eventId: string, attributeId: string) => {
  // Find and remove the attribute-based event with this attributeId
  const attributeEvent = props.filter.events.find(
    e => e.isAttributeBased && e.parentEventId === eventId && e.attributeConfig?.id === attributeId
  )

  if (attributeEvent) {
    const removed = props.filter.removeEvent(attributeEvent.id)
    if (removed) {
      emit('update:filter', props.filter)
      emit('attribute-removed', props.filter.id, eventId, attributeId)
    }
  }
}

// Group events by their parent relationships
const eventGroups = computed(() => {
  const groups: Array<{
    parentEvent: QueryFilterEvent
    attributeEvents: QueryFilterEvent[]
  }> = []

  // Find all parent events (non-attribute-based)
  const parentEvents = props.filter.events.filter(e => !e.isAttributeBased)

  parentEvents.forEach(parent => {
    const attributeEvents = props.filter.events.filter(e => e.parentEventId === parent.id)
    groups.push({
      parentEvent: parent,
      attributeEvents,
    })
  })

  return groups
})

// Get all events that are related to a nested event (for AttributesDropdown)
const getNestedEventGroup = (eventId: string) => {
  const relatedEvents: QueryFilterEvent[] = []

  // Find all events in nested structures that are related to this event
  props.filter.events.forEach(event => {
    if (event.isNested && event.nestedEvents) {
      event.nestedEvents.forEach(nestedEvent => {
        if (nestedEvent.id === eventId) {
          // Add the event itself
          relatedEvents.push(nestedEvent)
        }
        // Add any attribute-based events that belong to this event
        if (nestedEvent.isAttributeBased && nestedEvent.parentEventId === eventId) {
          relatedEvents.push(nestedEvent)
        }
      })
    }
  })

  return relatedEvents
}

// Group nested events by their parent relationships
const getNestedEventGroups = (nestedContainer: QueryFilterEvent) => {
  if (!nestedContainer.nestedEvents) return []

  const groups: Array<{
    parent: QueryFilterEvent
    attributes: QueryFilterEvent[]
  }> = []

  // Find all parent events (non-attribute-based) in the nested structure
  const parentEvents = nestedContainer.nestedEvents.filter(e => !e.isAttributeBased)

  parentEvents.forEach(parent => {
    const attributeEvents =
      nestedContainer.nestedEvents?.filter(e => e.isAttributeBased && e.parentEventId === parent.id) || []

    groups.push({
      parent,
      attributes: attributeEvents,
    })
  })

  return groups
}

// Handle nested criteria selection
const handleNestedCriteriaSelected = (nestedEventId: string, option: CriteriaOption) => {
  const newEvent = props.filter.addNestedEvent(nestedEventId, {
    conceptSet: option.title,
    criteriaType: option.id,
    chips: [],
  })
  emit('update:filter', props.filter)
  // Don't emit add-event for nested events - they're handled internally
}

// Handle nested event removal
const removeNestedEvent = (nestedEventId: string, eventId: string) => {
  const removed = props.filter.removeNestedEvent(nestedEventId, eventId)
  if (removed) {
    emit('update:filter', props.filter)
    emit('remove-event', props.filter.id, eventId)
  }
}

// Handle attribute selection for nested events
const handleNestedAttributeSelected = (eventId: string, attribute: AttributeConfig & { category: string }) => {
  // Use the new nested attribute handling
  const newEvent = props.filter.addNestedAttributeEvent(eventId, attribute)
  emit('update:filter', props.filter)
  emit('attribute-selected', props.filter.id, eventId, attribute, newEvent.id)
}

const handleNestedAttributeRemoved = (eventId: string, attributeId: string) => {
  // Find and remove the attribute-based event from nested structures
  props.filter.events.forEach(event => {
    if (event.isNested && event.nestedEvents) {
      const attributeEventIndex = event.nestedEvents.findIndex(
        e => e.isAttributeBased && e.parentEventId === eventId && e.attributeConfig?.id === attributeId
      )

      if (attributeEventIndex > -1) {
        event.nestedEvents.splice(attributeEventIndex, 1)
        emit('update:filter', props.filter)
        emit('attribute-removed', props.filter.id, eventId, attributeId)
      }
    }
  })
}

// Handle nested event removal with proper signature for recursive component
const handleNestedEventRemove = (parentEventId: string, eventId: string) => {
  const removed = props.filter.removeNestedEvent(parentEventId, eventId)
  if (removed) {
    emit('update:filter', props.filter)
    emit('remove-event', props.filter.id, eventId)
  }
}

// Handle toggle nested operator method
const handleToggleNestedOperator = (eventId: string) => {
  // Toggle the main filter operator for now - in a more complex implementation
  // this could toggle nested-specific operators
  toggleOperator()
  emit('toggle-nested-operator', props.filter.id, eventId)
}

// Expose the addChipToEvent method for parent access if needed
defineExpose({
  addChipToEvent,
})
</script>

<template>
  <div
    class="query-filter-card"
    :class="{
      'is-exclusion': filter.type === 'exclusion',
      'no-sidebar': hideGroupLabel,
      'has-any-sidebar': hideGroupLabel && filter.events.length > 1 && filter.isExpanded,
    }"
  >
    <div class="query-filter-card__header">
      <div class="query-filter-card__header-content">
        <button
          class="query-filter-card__toggle"
          @click="toggleExpanded"
          :aria-expanded="filter.isExpanded"
          :aria-label="filter.isExpanded ? 'Collapse filter' : 'Expand filter'"
        >
          <i class="icon" :class="filter.isExpanded ? 'icon-chevron-down' : 'icon-chevron-right'"></i>
        </button>

        <div class="query-filter-card__info">
          <h4 class="query-filter-card__title">{{ filter.title || 'Untitled Filter' }}</h4>
        </div>

        <button class="btn-remove-filter" @click="removeFilter" aria-label="Remove filter" title="Remove filter">
          ×
        </button>
      </div>
    </div>

    <div v-if="filter.isExpanded" class="query-filter-card__content">
      <!-- ANY/ALL sidebar positioned relative to content -->
      <div
        v-if="filter.events.length > 1"
        class="query-filter-card__content-sidebar"
        :class="{
          'content-sidebar-any': filter.operator === 'OR',
          'content-sidebar-all': filter.operator === 'AND',
        }"
      >
        <button
          class="content-sidebar-toggle"
          @click="toggleOperator"
          :title="`Click to switch to ${filter.operator === 'OR' ? 'ALL' : 'ANY'}`"
        >
          <span class="content-sidebar-label">{{ filter.operator === 'OR' ? 'ANY' : 'ALL' }}</span>
        </button>
      </div>

      <!-- Add event button for ANY section (multiple conditions) -->
      <div v-if="filter.events.length > 1 && showAddEventInAny" class="add-any-event-container">
        <button class="btn-add-any-event" @click="$emit('add-any-event')" title="Add event to ANY section">
          <span>Add event</span>
        </button>
      </div>

      <!-- Add event button for single condition cards -->
      <div v-if="filter.events.length <= 1 && showAddEventInAny" class="add-single-event-container">
        <div>{{ filter }}</div>
        <button class="btn-add-single-event" @click="$emit('add-event')" title="Add event">
          <span>Add event</span>
        </button>
      </div>

      <div
        v-for="(group, groupIndex) in eventGroups"
        :key="group.parentEvent.id"
        class="query-filter-event-group"
      >
        <!-- At least 1 sidebar that spans the parent event and all its attributes -->
        <div class="query-filter-event__at-least-group">
          <span>At least 1</span>
        </div>

        <!-- Parent event -->
        <div
          class="query-filter-event query-filter-event--parent"
          :class="{ 'has-nested': filter.events.length > 1 }"
        >
          <div class="query-filter-event__header">
            <span class="query-filter-event__label">
              {{ group.parentEvent.conceptSet || 'Event concept set' }}
            </span>
            <div class="query-filter-event__actions">
              <button
                class="btn-icon"
                @click="editEvent(group.parentEvent.id)"
                aria-label="Edit event"
                title="Edit event"
              >
                <i class="icon icon-pencil"></i>
              </button>
              <button
                class="btn-icon"
                @click="duplicateEvent(group.parentEvent.id)"
                aria-label="Duplicate event"
                title="Duplicate event"
              >
                <i class="icon icon-copy"></i>
              </button>
              <attributes-dropdown
                :criteria-type="group.parentEvent.criteriaType || 'conditionOccurrence'"
                :event-id="group.parentEvent.id"
                :all-events="filter.events"
                @attribute-selected="attr => handleAttributeSelected(group.parentEvent.id, attr)"
                @attribute-removed="attrId => handleAttributeRemoved(group.parentEvent.id, attrId)"
              />
              <!-- No remove button for parent conditions -->
            </div>
          </div>

          <div class="query-filter-event__chips">
            <query-filter-chip
              v-for="chip in group.parentEvent.chips"
              :key="chip.id"
              :chip="chip"
              :removable="true"
              @remove="removeChip(group.parentEvent.id, chip.id)"
            />
            <button class="btn-add-chip" @click="addChip(group.parentEvent.id)" aria-label="Add filter">
              <i class="icon icon-plus"></i>
            </button>
          </div>
        </div>

        <!-- Attribute-based conditions -->
        <div
          v-for="attrEvent in group.attributeEvents"
          :key="attrEvent.id"
          class="query-filter-event query-filter-event--attribute"
          :class="{ 'query-filter-event--nested': attrEvent.isNested }"
        >
          <div class="query-filter-event__header">
            <span class="query-filter-event__label query-filter-event__label--attribute">
              {{ attrEvent.conceptSet }}
            </span>
            <div class="query-filter-event__actions">
              <button
                v-if="!attrEvent.isNested"
                class="btn-icon"
                @click="editEvent(attrEvent.id)"
                aria-label="Edit attribute event"
                title="Edit attribute event"
              >
                <i class="icon icon-pencil"></i>
              </button>
              <button
                class="btn-remove-event"
                @click="removeEvent(attrEvent.id)"
                aria-label="Remove attribute event"
                title="Remove attribute event"
              >
                ×
              </button>
            </div>
          </div>

          <!-- Regular attribute condition chips -->
          <div v-if="!attrEvent.isNested" class="query-filter-event__chips">
            <query-filter-chip
              v-for="chip in attrEvent.chips"
              :key="chip.id"
              :chip="chip"
              :removable="true"
              @remove="removeChip(attrEvent.id, chip.id)"
            />
            <button class="btn-add-chip" @click="addChip(attrEvent.id)" aria-label="Add filter">
              <i class="icon icon-plus"></i>
            </button>
          </div>

          <!-- Nested criteria content -->
          <div v-if="attrEvent.isNested" class="query-filter-event__nested-content">
            <div>{{ attrEvent.id }}</div>
            <!-- Add event button for nested criteria -->
            <div class="nested-add-event-container">
              <criteria-selector-dropdown
                section-id="initialEvents"
                button-text="Add event"
                @criteria-selected="option => handleNestedCriteriaSelected(attrEvent.id, option)"
              />
            </div>

            <!-- Use recursive nested condition component -->
            <div
              v-for="nestedGroup in getNestedEventGroups(attrEvent)"
              :key="nestedGroup.parent.id"
              class="query-filter-nested-group"
            >
              <!-- Parent nested condition -->
              <query-filter-nested-condition
                :event="nestedGroup.parent"
                :parent-event-id="attrEvent.id"
                :level="0"
                :operator="filter.operator"
                :sibling-count="getNestedEventGroups(attrEvent).length"
                @edit-event="editEvent"
                @duplicate-event="duplicateEvent"
                @remove-event="handleNestedEventRemove"
                @add-chip="addChip"
                @remove-chip="removeChip"
                @attribute-selected="handleNestedAttributeSelected"
                @attribute-removed="handleNestedAttributeRemoved"
                @criteria-selected="handleNestedCriteriaSelected"
                @toggle-operator="handleToggleNestedOperator"
              />

              <!-- Nested attribute conditions -->
              <query-filter-nested-condition
                v-for="attrEvent in nestedGroup.attributes"
                :key="attrEvent.id"
                :event="attrEvent"
                :parent-event-id="attrEvent.id"
                :level="0"
                :operator="filter.operator"
                :sibling-count="getNestedEventGroups(attrEvent).length"
                class="query-filter-nested-event--attribute"
                @edit-event="editEvent"
                @duplicate-event="duplicateEvent"
                @remove-event="handleNestedEventRemove"
                @add-chip="addChip"
                @remove-chip="removeChip"
                @attribute-selected="handleNestedAttributeSelected"
                @attribute-removed="handleNestedAttributeRemoved"
                @criteria-selected="handleNestedCriteriaSelected"
                @toggle-operator="handleToggleNestedOperator"
              />
            </div>

            <!-- Empty state for nested criteria -->
            <div v-if="!attrEvent.nestedEvents?.length" class="nested-empty-state">
              <p>No nested events added yet</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filter.events.length === 0" class="query-filter-card__empty">
        <p>No events added yet</p>
        <button class="btn btn-link" @click="addEvent">
          <i class="icon icon-plus"></i>
          Add event
        </button>
      </div>
    </div>

    <div
      v-if="!hideGroupLabel"
      class="query-filter-card__sidebar"
      :class="{ 'sidebar-exclusion': filter.type === 'exclusion' }"
    >
      <span class="sidebar-label">{{ sidebarLabel }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../styles/QueryFilterCardStyles';
</style>
