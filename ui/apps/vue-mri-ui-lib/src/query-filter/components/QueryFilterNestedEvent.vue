<script lang="ts">
export default {
  name: 'QueryFilterNestedEvent',
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterEvent } from '../models/QueryFilterModel'
import QueryFilterChip from './QueryFilterChip.vue'
import AttributesDropdown from './AttributesDropdown.vue'
import CriteriaSelectorDropdown from './CriteriaSelectorDropdown.vue'
import QueryFilterTagInputAdapter from '../../lib/ui/QueryFilterTagInputAdapter.vue'
import { type AttributeConfig, type CriteriaOption } from '../utils/CriteriaConfigLoader'

const props = defineProps<{
  event: QueryFilterEvent
  parentEventId?: string
  level?: number
  operator?: 'OR' | 'AND'
  siblingCount?: number // Number of sibling events at the same level
  conceptSets?: any[]
  conceptSetDomainValues?: any
  conceptSetTexts?: any
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
  'toggle-operator',
  'concept-set-selected',
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

const handleRemoveEvent = (parentEventId: string, eventId: string) => {
  // Handle nested event removal (bubbling up from child)
  emit('remove-event', parentEventId, eventId)
}

const removeSelf = () => {
  // Handle removing this event itself
  emit('remove-event', props.parentEventId || '', props.event.id)
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

// Handle operator toggle for nested events
const toggleOperator = () => {
  emit('toggle-operator', props.event.id)
}

// Get the current operator for this nested event
const currentOperator = computed(() => {
  return props.operator || 'AND'
})

// Handle concept set selection for nested events
const handleConceptSetSelected = (eventId: string, conceptSet: any) => {
  emit('concept-set-selected', eventId, conceptSet)
}

// Handle concept set search change
const handleConceptSetSearchChange = (eventId: string, searchQuery: string) => {
  // For now, just log the search - parent can handle filtering
  console.log('Nested concept set search change for event:', eventId, searchQuery)
}

// Handle concept set action (create/edit)
const handleConceptSetAction = (eventId: string, action: any) => {
  console.log('Nested concept set action for event:', eventId, action)
}

// Get concept set model for a nested event
const getConceptSetModel = (event: QueryFilterEvent) => {
  return {
    id: `concept-set-${event.id}`,
    props: {
      type: 'conceptSet',
      value: event.selectedConceptSet ? [event.selectedConceptSet] : [],
      attributePath: 'condition_occurrence.concept_id',
      domainFilter: 'Condition',
      standardConceptCodeFilter: 'Standard',
    },
  }
}
</script>

<template>
  <div class="query-filter-nested-event" :class="`query-filter-nested-event--level-${currentLevel}`">
    <!-- Handle regular nested events (not deeply nested) -->
    <template v-if="!event.isNested">
      <div
        class="query-filter-nested-event__container"
        :class="{
          'has-content-sidebar':
            (props.siblingCount && props.siblingCount > 1) || (event.nestedEvents && event.nestedEvents.length > 1),
        }"
      >
        <!-- ANY/ALL sidebar for first level nested events -->
        <div
          v-if="(props.siblingCount && props.siblingCount > 1) || (event.nestedEvents && event.nestedEvents.length > 1)"
          class="query-filter-card__content-sidebar"
          :class="{
            'content-sidebar-any': currentOperator === 'OR',
            'content-sidebar-all': currentOperator === 'AND',
          }"
        >
          <button
            class="content-sidebar-toggle"
            @click="toggleOperator"
            :title="`Click to switch to ${currentOperator === 'OR' ? 'ALL' : 'ANY'}`"
          >
            <span class="content-sidebar-label">{{ currentOperator === 'OR' ? 'ANY' : 'ALL' }}</span>
          </button>
        </div>

        <div
          class="query-filter-nested-event__simple"
          :class="{
            'query-filter-nested-event__simple--has-nested': event.nestedEvents && event.nestedEvents.length > 0,
          }"
        >
          <div class="query-filter-nested-event__header">
            <div class="query-filter-nested-event__concept-set-container">
              <QueryFilterTagInputAdapter
                v-if="conceptSets && conceptSetDomainValues && conceptSetTexts"
                :model="getConceptSetModel(event)"
                :external-value="event.selectedConceptSet ? [event.selectedConceptSet] : []"
                :external-domain-values="conceptSetDomainValues"
                :external-texts="conceptSetTexts"
                :is-catalog-attribute="false"
                @update:value="(value) => handleConceptSetSelected(event.id, value[0])"
                @search-change="(query) => handleConceptSetSearchChange(event.id, query)"
                @concept-set-action="(action) => handleConceptSetAction(event.id, action)"
              />
              <span v-else class="query-filter-nested-event__label">
                {{ event.conceptSet || 'Nested Event' }}
                <span v-if="event.conceptSetLoading" style="margin-left: 8px; font-style: italic; color: #666;">
                  (Loading concept details...)
                </span>
              </span>
            </div>
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
                @click="removeSelf"
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

          <!-- Render nested children if this event has them -->
          <div v-if="event.nestedEvents && event.nestedEvents.length > 0" class="nested-children-container">
            <!-- Render nested event groups with "At least 1" sidebar -->
            <div v-for="group in nestedEventGroups" :key="group.parent.id" class="query-filter-event-group">
              <!-- At least 1 sidebar that spans the parent event and all its attributes -->
              <div class="query-filter-event__at-least-group">
                <span>At least 1</span>
              </div>

              <!-- Parent nested condition -->
              <query-filter-nested-condition
                :event="group.parent"
                :parent-event-id="event.id"
                :level="currentLevel + 1"
                :operator="currentOperator"
                :sibling-count="nestedEventGroups.length"
                :concept-sets="conceptSets"
                :concept-set-domain-values="conceptSetDomainValues"
                :concept-set-texts="conceptSetTexts"
                @edit-event="handleEditEvent"
                @duplicate-event="handleDuplicateEvent"
                @remove-event="handleRemoveEvent"
                @add-chip="handleAddChip"
                @remove-chip="handleRemoveChip"
                @attribute-selected="(eventId, attribute) => emit('attribute-selected', eventId, attribute)"
                @attribute-removed="(eventId, attributeId) => emit('attribute-removed', eventId, attributeId)"
                @criteria-selected="(targetId, option) => emit('criteria-selected', targetId, option)"
                @toggle-operator="eventId => emit('toggle-operator', eventId)"
                @concept-set-selected="handleConceptSetSelected"
              />

              <!-- Nested attribute conditions -->
              <query-filter-nested-condition
                v-for="attrEvent in group.attributes"
                :key="attrEvent.id"
                :event="attrEvent"
                :parent-event-id="event.id"
                :level="currentLevel + 1"
                :operator="currentOperator"
                :sibling-count="nestedEventGroups.length"
                :concept-sets="conceptSets"
                :concept-set-domain-values="conceptSetDomainValues"
                :concept-set-texts="conceptSetTexts"
                class="query-filter-nested-event--attribute"
                @edit-event="handleEditEvent"
                @duplicate-event="handleDuplicateEvent"
                @remove-event="handleRemoveEvent"
                @add-chip="handleAddChip"
                @remove-chip="handleRemoveChip"
                @attribute-selected="(eventId, attribute) => emit('attribute-selected', eventId, attribute)"
                @attribute-removed="(eventId, attributeId) => emit('attribute-removed', eventId, attributeId)"
                @criteria-selected="(targetId, option) => emit('criteria-selected', targetId, option)"
                @toggle-operator="eventId => emit('toggle-operator', eventId)"
                @concept-set-selected="handleConceptSetSelected"
              />
            </div>

            <!-- Fallback: Render ungrouped nested events if no groups exist -->
            <query-filter-nested-condition
              v-for="nestedEvent in event.nestedEvents?.filter(
                e => !nestedEventGroups.some(g => g.parent.id === e.id || g.attributes.some(a => a.id === e.id))
              )"
              :key="nestedEvent.id"
              :event="nestedEvent"
              :parent-event-id="event.id"
              :level="currentLevel + 1"
              :operator="currentOperator"
              :sibling-count="event.nestedEvents?.length || 0"
              :concept-sets="conceptSets"
              :concept-set-domain-values="conceptSetDomainValues"
              :concept-set-texts="conceptSetTexts"
              :class="{ 'query-filter-nested-event--attribute': nestedEvent.isAttributeBased }"
              @edit-event="handleEditEvent"
              @duplicate-event="handleDuplicateEvent"
              @remove-event="handleRemoveEvent"
              @add-chip="handleAddChip"
              @remove-chip="handleRemoveChip"
              @attribute-selected="(eventId, attribute) => emit('attribute-selected', eventId, attribute)"
              @attribute-removed="(eventId, attributeId) => emit('attribute-removed', eventId, attributeId)"
              @criteria-selected="(targetId, option) => emit('criteria-selected', targetId, option)"
              @toggle-operator="eventId => emit('toggle-operator', eventId)"
              @concept-set-selected="handleConceptSetSelected"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Handle deeply nested events (recursive case) -->
    <template v-else>
      <div
        class="query-filter-nested-event__container"
        :class="{
          'has-content-sidebar': event.nestedEvents && event.nestedEvents.length > 1,
        }"
      >
        <!-- ANY/ALL sidebar positioned relative to nested content -->
        <div
          v-if="event.nestedEvents && event.nestedEvents.length > 1"
          class="query-filter-card__content-sidebar"
          :class="{
            'content-sidebar-any': currentOperator === 'OR',
            'content-sidebar-all': currentOperator === 'AND',
          }"
        >
          <button
            class="content-sidebar-toggle"
            @click="toggleOperator"
            :title="`Click to switch to ${currentOperator === 'OR' ? 'ALL' : 'ANY'}`"
          >
            <span class="content-sidebar-label">{{ currentOperator === 'OR' ? 'ANY' : 'ALL' }}</span>
          </button>
        </div>

        <div class="query-filter-nested-event__nested-content">
          <!-- Add event button for nested criteria -->
          <div class="nested-add-event-container">
            <criteria-selector-dropdown
              section-id="initialEvents"
              button-text="Add event"
              @criteria-selected="handleCriteriaSelected"
            />
          </div>

          <!-- Render nested event groups with "At least 1" sidebar -->
          <div v-for="group in nestedEventGroups" :key="group.parent.id" class="query-filter-event-group">
            <!-- At least 1 sidebar that spans the parent event and all its attributes -->
            <div class="query-filter-event__at-least-group">
              <span>At least 1</span>
            </div>

            <!-- Parent nested condition -->
            <query-filter-nested-condition
              :event="group.parent"
              :parent-event-id="event.id"
              :level="currentLevel + 1"
              :operator="currentOperator"
              :concept-sets="conceptSets"
              :concept-set-domain-values="conceptSetDomainValues"
              :concept-set-texts="conceptSetTexts"
              @edit-event="handleEditEvent"
              @duplicate-event="handleDuplicateEvent"
              @remove-event="handleRemoveEvent"
              @add-chip="handleAddChip"
              @remove-chip="handleRemoveChip"
              @attribute-selected="(eventId, attribute) => emit('attribute-selected', eventId, attribute)"
              @attribute-removed="(eventId, attributeId) => emit('attribute-removed', eventId, attributeId)"
              @criteria-selected="(targetId, option) => emit('criteria-selected', targetId, option)"
              @toggle-operator="eventId => emit('toggle-operator', eventId)"
              @concept-set-selected="handleConceptSetSelected"
            />

            <!-- Nested attribute conditions -->
            <query-filter-nested-condition
              v-for="attrEvent in group.attributes"
              :key="attrEvent.id"
              :event="attrEvent"
              :parent-event-id="event.id"
              :level="currentLevel + 1"
              :operator="currentOperator"
              :concept-sets="conceptSets"
              :concept-set-domain-values="conceptSetDomainValues"
              :concept-set-texts="conceptSetTexts"
              class="query-filter-nested-event--attribute"
              @edit-event="handleEditEvent"
              @duplicate-event="handleDuplicateEvent"
              @remove-event="handleRemoveEvent"
              @add-chip="handleAddChip"
              @remove-chip="handleRemoveChip"
              @attribute-selected="(eventId, attribute) => emit('attribute-selected', eventId, attribute)"
              @attribute-removed="(eventId, attributeId) => emit('attribute-removed', eventId, attributeId)"
              @criteria-selected="(targetId, option) => emit('criteria-selected', targetId, option)"
              @toggle-operator="eventId => emit('toggle-operator', eventId)"
              @concept-set-selected="handleConceptSetSelected"
            />
          </div>

          <!-- Fallback: Render ungrouped nested events if no groups exist -->
          <query-filter-nested-condition
            v-for="nestedEvent in event.nestedEvents?.filter(
              e => !nestedEventGroups.some(g => g.parent.id === e.id || g.attributes.some(a => a.id === e.id))
            )"
            :key="nestedEvent.id"
            :event="nestedEvent"
            :parent-event-id="event.id"
            :level="currentLevel + 1"
            :operator="currentOperator"
            :concept-sets="conceptSets"
            :concept-set-domain-values="conceptSetDomainValues"
            :concept-set-texts="conceptSetTexts"
            :class="{ 'query-filter-nested-event--attribute': nestedEvent.isAttributeBased }"
            @edit-event="handleEditEvent"
            @duplicate-event="handleDuplicateEvent"
            @remove-event="handleRemoveEvent"
            @add-chip="handleAddChip"
            @remove-chip="handleRemoveChip"
            @attribute-selected="(eventId, attribute) => emit('attribute-selected', eventId, attribute)"
            @attribute-removed="(eventId, attributeId) => emit('attribute-removed', eventId, attributeId)"
            @criteria-selected="(targetId, option) => emit('criteria-selected', targetId, option)"
            @toggle-operator="eventId => emit('toggle-operator', eventId)"
            @concept-set-selected="handleConceptSetSelected"
          />

          <!-- Empty state for nested criteria -->
          <div v-if="!event.nestedEvents?.length" class="nested-empty-state">
            <p>No nested events added yet</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-nested-event {
  position: relative; // Add positioning context for sidebars
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

.query-filter-nested-event__concept-set-container {
  flex: 1;
  min-width: 0; // Allow container to shrink
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

// Simple container for regular nested events
.query-filter-nested-event__simple {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;

  // Ensure we have the right padding when inside a container with sidebar
  .query-filter-nested-event__container.has-content-sidebar & {
    padding-left: calc(8px + 36px); // Base padding + sidebar space
  }

  // Apply nested styling (yellow background) when this event has nested children
  &--has-nested {
    background: #fefce8;
    border: 2px solid #facc15;
  }
}

// Container for nested events that need sidebars
.query-filter-nested-event__container {
  position: relative;

  &.has-content-sidebar {
    .query-filter-nested-event__nested-content {
      padding-left: calc(1rem + 36px); // Base padding + sidebar space for nested events
    }
  }

  // ANY/ALL content sidebar styles (copy from QueryFilterCardStyles.scss)
  .query-filter-card__content-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: sideways-lr;
    text-orientation: mixed;
    border-radius: 4px 0 0 4px;
    z-index: 10;

    &.content-sidebar-any {
      background: #ef4444;
    }

    &.content-sidebar-all {
      background: #8b5cf6;
    }

    .content-sidebar-toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;

      &:hover {
        opacity: 0.8;
      }
    }

    .content-sidebar-label {
      color: white;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      pointer-events: none;
    }
  }
}

.query-filter-nested-event__nested-content {
  padding: 1rem;
  border: 1px dashed #ccc;
  border-radius: 4px;
  background: #fafafa;
  position: relative;

  // Apply nested styling (yellow background) when this contains nested events
  &:has(.query-filter-event-group) {
    background: #fefce8;
    border: 2px solid #facc15;
  }
}

.nested-add-event-container {
  margin: 1rem 0;
}

// Styles for nested event groups with "At least 1" sidebars
.query-filter-event-group {
  position: relative;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  .query-filter-event__at-least-group {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 30px;
    background: #ddd6fe;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: sideways-lr;
    text-orientation: mixed;
    border-radius: 6px 0 0 6px;
    z-index: 1;

    span {
      font-size: 11px;
      font-weight: 500;
      color: #5b21b6;
      white-space: nowrap;
    }
  }

  // Add left margin to nested components inside event groups to make room for "At least 1" sidebar
  .query-filter-nested-event {
    margin-left: 30px;
    border-radius: 0 6px 6px 0;
  }
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
