<script lang="ts">
export default {
  name: 'QueryFilterNestedCondition',
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterEvent } from '../models/QueryFilterModel'
import QueryFilterChip from './QueryFilterChip.vue'
import AttributesDropdown from './AttributesDropdown.vue'
import CriteriaSelectorDropdown from './CriteriaSelectorDropdown.vue'
import { type AttributeConfig, type CriteriaOption } from '../utils/CriteriaConfigLoader'

const props = defineProps<{
  event: QueryFilterEvent
  parentEventId?: string
  level?: number
}>()

const emit = defineEmits([
  'edit-event',
  'duplicate-event',
  'remove-event',
  'add-chip',
  'remove-chip',
  'attribute-selected',
  'attribute-removed',
  'criteria-selected',
])

const currentLevel = computed(() => props.level || 0)

// Group nested events by their parent relationships
const nestedEventGroups = computed(() => {
  if (!props.event.nestedEvents) return []

  const groups: Array<{
    parent: QueryFilterEvent
    attributes: QueryFilterEvent[]
  }> = []

  // Find all parent events (non-attribute-based) in the nested structure
  const parentEvents = props.event.nestedEvents.filter(e => !e.isAttributeBased)

  parentEvents.forEach(parent => {
    const attributeEvents =
      props.event.nestedEvents?.filter(e => e.isAttributeBased && e.parentEventId === parent.id) || []

    groups.push({
      parent,
      attributes: attributeEvents,
    })
  })

  return groups
})

// Get all events that are related to a nested event (for AttributesDropdown)
const getNestedEventGroup = (eventId: string) => {
  const relatedEvents: QueryFilterEvent[] = []

  if (props.event.nestedEvents) {
    props.event.nestedEvents.forEach(nestedEvent => {
      if (nestedEvent.id === eventId) {
        relatedEvents.push(nestedEvent)
      }
      if (nestedEvent.isAttributeBased && nestedEvent.parentEventId === eventId) {
        relatedEvents.push(nestedEvent)
      }
    })
  }

  return relatedEvents
}

// Event handlers - these all bubble up to the parent component
const handleEditEvent = (eventId: string) => {
  emit('edit-event', eventId)
}

const handleDuplicateEvent = (eventId: string) => {
  emit('duplicate-event', eventId)
}

const handleRemoveEvent = (eventId: string) => {
  emit('remove-event', props.event.id, eventId)
}

const handleAddChip = (eventId: string) => {
  emit('add-chip', eventId)
}

const handleRemoveChip = (eventId: string, chipId: string) => {
  emit('remove-chip', eventId, chipId)
}

const handleAttributeSelected = (eventId: string, attribute: AttributeConfig & { category: string }) => {
  emit('attribute-selected', eventId, attribute)
}

const handleAttributeRemoved = (eventId: string, attributeId: string) => {
  emit('attribute-removed', eventId, attributeId)
}

const handleCriteriaSelected = (option: CriteriaOption) => {
  emit('criteria-selected', props.event.id, option)
}
</script>

<template>
  <div class="query-filter-nested-event" :class="`query-filter-nested-event--level-${currentLevel}`">
    <!-- Handle regular nested events (not deeply nested) -->
    <template v-if="!event.isNested">
      <div>{{ event.id }}</div>
      <div class="query-filter-nested-event__header">
        <span class="query-filter-nested-event__label">
          {{ event.conceptSet || 'Nested Event' }}
        </span>
        <div class="query-filter-nested-event__actions">
          <button
            class="btn-icon"
            @click="handleEditEvent(event.id)"
            aria-label="Edit nested event"
            title="Edit nested event"
          >
            <i class="icon icon-pencil"></i>
          </button>
          <button
            class="btn-icon"
            @click="handleDuplicateEvent(event.id)"
            aria-label="Duplicate nested event"
            title="Duplicate nested event"
          >
            <i class="icon icon-copy"></i>
          </button>
          <attributes-dropdown
            :criteria-type="event.criteriaType || 'conditionOccurrence'"
            :event-id="event.id"
            :all-events="getNestedEventGroup(event.id)"
            @attribute-selected="attr => handleAttributeSelected(event.id, attr)"
            @attribute-removed="attrId => handleAttributeRemoved(event.id, attrId)"
          />
          <button
            class="btn-remove-event"
            @click="handleRemoveEvent(event.id)"
            aria-label="Remove nested event"
            title="Remove nested event"
          >
            ×
          </button>
        </div>
      </div>

      <div class="query-filter-nested-condition__chips">
        <query-filter-chip
          v-for="chip in event.chips"
          :key="chip.id"
          :chip="chip"
          :removable="true"
          @remove="handleRemoveChip(event.id, chip.id)"
        />
        <button class="btn-add-chip" @click="handleAddChip(event.id)" aria-label="Add filter">
          <i class="icon icon-plus"></i>
        </button>
      </div>
    </template>

    <!-- Handle deeply nested events (recursive case) -->
    <template v-else>
      <div class="query-filter-nested-event__nested-content">
        <div>JEROME</div>
        <div>{{ event.id }}</div>
        <!-- Add event button for nested criteria -->
        <div class="nested-add-event-container">
          <criteria-selector-dropdown
            section-id="initialEvents"
            button-text="Add event"
            @criteria-selected="handleCriteriaSelected"
          />
        </div>

        <!-- Recursive rendering of nested events -->
        <query-filter-nested-condition
          v-for="nestedEvent in event.nestedEvents"
          :key="nestedEvent.id"
          :event="nestedEvent"
          :parent-event-id="event.id"
          :level="currentLevel + 1"
          :class="{ 'query-filter-nested-event--attribute': nestedEvent.isAttributeBased }"
          @edit-event="handleEditEvent"
          @duplicate-event="handleDuplicateEvent"
          @remove-event="handleRemoveEvent"
          @add-chip="handleAddChip"
          @remove-chip="handleRemoveChip"
          @attribute-selected="(eventId, attribute) => emit('attribute-selected', eventId, attribute)"
          @attribute-removed="(eventId, attributeId) => emit('attribute-removed', eventId, attributeId)"
          @criteria-selected="(targetId, option) => emit('criteria-selected', targetId, option)"
        />

        <!-- Empty state for nested criteria -->
        <div v-if="!event.nestedEvents?.length" class="nested-empty-state">
          <p>No nested events added yet</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-nested-event {
  &--level-0 {
    margin-left: 0;
  }

  &--level-1 {
    margin-left: 1rem;
  }

  &--level-2 {
    margin-left: 2rem;
  }

  &--level-3 {
    margin-left: 3rem;
  }

  // Add more levels as needed
  &--attribute {
    .query-filter-nested-event__label {
      font-style: italic;
      color: #666;
    }
  }
}

.query-filter-nested-event__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.query-filter-nested-event__label {
  font-weight: 500;
  color: #333;

  &--attribute {
    font-style: italic;
    color: #666;
  }
}

.query-filter-nested-event__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.query-filter-nested-event__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}

.query-filter-nested-event__nested-content {
  padding: 1rem;
  border: 1px dashed #ccc;
  border-radius: 4px;
  background: #fafafa;
}

.nested-add-event-container {
  margin: 1rem 0;
}

.nested-empty-state {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 1rem;
}

.btn-icon {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #666;

  &:hover {
    color: #333;
  }
}

.btn-remove-event {
  background: none;
  border: none;
  color: #dc3545;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;

  &:hover {
    color: #a71e2a;
  }
}

.btn-add-chip {
  background: #f8f9fa;
  border: 1px dashed #ccc;
  color: #666;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: #e9ecef;
    border-color: #999;
  }
}
</style>

