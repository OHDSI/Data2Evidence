<script lang="ts">
export default {
  name: 'QueryFilterCard',
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterCardModel, QueryFilterChip as QueryFilterChipType } from '../lib/models/QueryFilterModel'
import QueryFilterChip from './QueryFilterChip.vue'

const props = defineProps<{
  filter: QueryFilterCardModel
  hideGroupLabel?: boolean
  showAddEventInAny?: boolean
}>()

const emit = defineEmits([
  'update:filter',
  'add-event',
  'add-condition',
  'edit-condition',
  'duplicate-condition',
  'remove-condition',
  'add-chip',
  'remove-chip',
  'show-menu',
  'remove-filter',
  'add-any-event',
])

const sidebarLabel = computed(() => {
  return props.filter.type === 'inclusion' ? 'ALL 9' : 'Exclusion'
})

const toggleExpanded = () => {
  props.filter.toggle()
  emit('update:filter', props.filter)
}

const addCondition = () => {
  // Use the model's method to add a new condition
  const newCondition = props.filter.addCondition({
    conceptSet: 'New Concept Set',
    chips: [],
  })
  emit('update:filter', props.filter)
  emit('add-condition', props.filter.id, newCondition.id)
}

const editCondition = (conditionId: string) => {
  emit('edit-condition', props.filter.id, conditionId)
}

const duplicateCondition = (conditionId: string) => {
  const condition = props.filter.getCondition(conditionId)
  if (condition) {
    // Create a duplicate of the condition
    const duplicatedCondition = props.filter.addCondition({
      conceptSet: `${condition.conceptSet} (Copy)`,
      conceptSetId: condition.conceptSetId,
      chips: condition.chips.map(chip => ({
        ...chip,
        id: `chip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      })),
      operator: condition.operator,
    })
    emit('update:filter', props.filter)
    emit('duplicate-condition', props.filter.id, conditionId, duplicatedCondition.id)
  }
}

const removeCondition = (conditionId: string) => {
  const removed = props.filter.removeCondition(conditionId)
  if (removed) {
    emit('update:filter', props.filter)
    emit('remove-condition', props.filter.id, conditionId)
  }
}

const showConditionMenu = (conditionId: string) => {
  emit('show-menu', props.filter.id, conditionId)
}

const addChip = (conditionId: string) => {
  // For now, emit to parent to handle chip selection
  // In real implementation, this would open a concept selector
  emit('add-chip', props.filter.id, conditionId)
}

const removeChip = (conditionId: string, chipId: string) => {
  const removed = props.filter.removeChipFromCondition(conditionId, chipId)
  if (removed) {
    emit('update:filter', props.filter)
    emit('remove-chip', props.filter.id, conditionId, chipId)
  }
}

const removeFilter = () => {
  emit('remove-filter', props.filter.id)
}

// Helper to add a chip programmatically (can be called from parent)
const addChipToCondition = (conditionId: string, chip: Partial<QueryFilterChipType>) => {
  const newChip: QueryFilterChipType = {
    id: chip.id || `chip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    label: chip.label || 'New Chip',
    value: chip.value || '',
    color: chip.color,
    conceptId: chip.conceptId,
    domainId: chip.domainId,
  }

  const added = props.filter.addChipToCondition(conditionId, newChip)
  if (added) {
    emit('update:filter', props.filter)
  }
  return added
}

// Expose the addChipToCondition method for parent access if needed
defineExpose({
  addChipToCondition,
})
</script>

<template>
  <div class="query-filter-card" :class="{ 
    'is-exclusion': filter.type === 'exclusion', 
    'no-sidebar': hideGroupLabel,
    'has-any-sidebar': hideGroupLabel && filter.conditions.length > 1 && filter.isExpanded
  }">
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
      </div>
    </div>

    <div v-if="filter.isExpanded" class="query-filter-card__content">
      <!-- ANY sidebar positioned relative to content -->
      <div
        v-if="filter.conditions.length > 1"
        class="query-filter-card__content-sidebar"
        :class="{ 'content-sidebar-any': true }"
      >
        <span class="content-sidebar-label">ANY</span>
      </div>

      <!-- Add event button for ANY section (multiple conditions) -->
      <div v-if="filter.conditions.length > 1 && showAddEventInAny" class="add-any-event-container">
        <button class="btn-add-any-event" @click="$emit('add-any-event')" title="Add event to ANY section">
          <span>Add event</span>
        </button>
      </div>

      <!-- Add event button for single condition cards -->
      <div v-if="filter.conditions.length <= 1 && showAddEventInAny" class="add-single-event-container">
        <button class="btn-add-single-event" @click="$emit('add-event')" title="Add event">
          <span>Add event</span>
        </button>
      </div>
      
      <div
        v-for="(condition, index) in filter.conditions"
        :key="condition.id"
        class="query-filter-condition"
        :class="{ 'has-nested': filter.conditions.length > 1 }"
      >
        <div class="query-filter-condition__at-least">
          <span>At least 1</span>
        </div>
        <div class="query-filter-condition__header">
          <span class="query-filter-condition__label">
            {{ condition.conceptSet || 'Condition concept set' }}
          </span>
          <div class="query-filter-condition__actions">
            <button
              class="btn-icon"
              @click="editCondition(condition.id)"
              aria-label="Edit condition"
              title="Edit condition"
            >
              <i class="icon icon-pencil"></i>
            </button>
            <button
              class="btn-icon"
              @click="duplicateCondition(condition.id)"
              aria-label="Duplicate condition"
              title="Duplicate condition"
            >
              <i class="icon icon-copy"></i>
            </button>
            <button
              class="btn-icon btn-icon--danger"
              @click="removeCondition(condition.id)"
              aria-label="Remove condition"
              title="Remove condition"
            >
              <i class="icon icon-trash"></i>
            </button>
            <button
              class="btn-hamburger-menu"
              @click="showConditionMenu(condition.id)"
              aria-label="More options"
              title="More options"
            >
              =
            </button>
          </div>
        </div>

        <div class="query-filter-condition__chips">
          <query-filter-chip
            v-for="chip in condition.chips"
            :key="chip.id"
            :chip="chip"
            :removable="true"
            @remove="removeChip(condition.id, chip.id)"
          />
          <button class="btn-add-chip" @click="addChip(condition.id)" aria-label="Add filter">
            <i class="icon icon-plus"></i>
          </button>
        </div>
      </div>

      <div v-if="filter.conditions.length === 0" class="query-filter-card__empty">
        <p>No conditions added yet</p>
        <button class="btn btn-link" @click="addCondition">
          <i class="icon icon-plus"></i>
          Add condition
        </button>
      </div>
    </div>

    <div v-if="!hideGroupLabel" class="query-filter-card__sidebar" :class="{ 'sidebar-exclusion': filter.type === 'exclusion' }">
      <span class="sidebar-label">{{ sidebarLabel }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-card {
  position: relative;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 8px;
  padding-left: 110px;
  overflow: visible;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;

  &.is-exclusion {
    border-color: #ff6b6b;
  }

  &.no-sidebar {
    padding-left: 0;
    
    .query-filter-card__header {
      padding-left: 4px;
    }
    
    .query-filter-card__content {
      padding-left: 4px;
    }
  }

  &.has-any-sidebar {
    .query-filter-card__header {
      padding-left: 4px;
    }
    
    .query-filter-card__content {
      padding-left: 36px; // Space for the ANY sidebar when it exists
    }
  }

  &__header {
    padding: 8px 6px;
    border-bottom: 1px solid #f0f0f0;
  }

  &__header-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    flex: 1;
  }

  &__toggle {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #666;

    &:hover {
      color: #333;
    }

    .icon {
      font-size: 14px;
    }
  }

  .btn-add-event {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background: #2563eb;
    }

    .icon {
      font-size: 16px;
    }
  }

  &__content {
    padding: 8px 6px;
    position: relative;
  }

  &__empty {
    text-align: center;
    padding: 20px;
    color: #666;

    p {
      margin-bottom: 12px;
    }

    .btn-link {
      color: #3b82f6;
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 4px;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  &__sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 60px;
    background: #1e40af;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: sideways-lr;
    text-orientation: mixed;

    &.sidebar-exclusion {
      background: #ff6b6b;
    }

    .sidebar-label {
      color: white;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
  }

  &__content-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 32px;
    background: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: sideways-lr;
    text-orientation: mixed;
    border-radius: 0 0 0 6px;

    &.content-sidebar-any {
      background: #ef4444;
    }

    .content-sidebar-label {
      color: white;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
  }

  .add-any-event-container {
    margin-bottom: 8px;
    margin-left: 2px; // Align with the conditions left edge
  }

  .add-single-event-container {
    margin-bottom: 8px;
    margin-left: 2px; // Align with the conditions left edge
  }

  .btn-add-any-event,
  .btn-add-single-event {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
    text-align: center;

    &:hover {
      background: #2563eb;
    }
  }
}

.query-filter-condition {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0 6px 6px 0;
  padding: 8px 6px;
  margin-bottom: 8px;
  position: relative;
  margin-left: 30px;

  &:last-child {
    margin-bottom: 0;
  }

  &__at-least {
    position: absolute;
    left: -30px;
    top: -1px;
    bottom: -1px;
    width: 30px;
    background: #ddd6fe;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: sideways-lr;
    text-orientation: mixed;
    border-radius: 6px 0 0 6px;

    span {
      font-size: 11px;
      font-weight: 500;
      color: #5b21b6;
      white-space: nowrap;
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  &__label {
    font-size: 14px;
    color: #666;
  }

  &__actions {
    display: flex;
    gap: 4px;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
}

.btn-icon {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    color: #333;
  }

  &--danger {
    &:hover {
      background: #fee2e2;
      color: #dc2626;
    }
  }

  &--more {
    .icon {
      font-size: 16px;
    }
  }

  .icon {
    font-size: 14px;
  }
}

.btn-hamburger-menu {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    color: #333;
  }

  .icon {
    font-size: 14px;
  }
}

.btn-add-chip {
  background: white;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .icon {
    font-size: 12px;
  }
}
</style>
