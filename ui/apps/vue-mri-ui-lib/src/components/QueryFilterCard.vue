<script lang="ts">
export default {
  name: 'QueryFilterCard'
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterCardModel, QueryFilterChip as QueryFilterChipType } from '../lib/models/QueryFilterModel'
import QueryFilterChip from './QueryFilterChip.vue'

const props = defineProps<{
  filter: QueryFilterCardModel
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
])

const sidebarLabel = computed(() => {
  return props.filter.type === 'inclusion' ? 'All Patients' : 'Exclusion'
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
  addChipToCondition
})
</script>

<template>
  <div class="query-filter-card" :class="{ 'is-exclusion': filter.type === 'exclusion' }">
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

        <div class="query-filter-card__add-button">
          <button class="btn-add-event" @click="$emit('add-event')">
            <i class="icon icon-plus-circle"></i>
            <span>Add event</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="filter.isExpanded" class="query-filter-card__content">
      <div v-for="condition in filter.conditions" :key="condition.id" class="query-filter-condition">
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
              class="btn-icon btn-icon--more"
              @click="showConditionMenu(condition.id)"
              aria-label="More options"
              title="More options"
            >
              <i class="icon icon-ellipsis-v"></i>
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

    <div class="query-filter-card__sidebar" :class="{ 'sidebar-exclusion': filter.type === 'exclusion' }">
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
  margin-bottom: 16px;
  padding-left: 40px;
  overflow: hidden;

  &.is-exclusion {
    border-color: #ff6b6b;
  }

  &__header {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  &__header-content {
    display: flex;
    align-items: center;
    gap: 12px;
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

  &__add-button {
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
  }

  &__content {
    padding: 16px;
  }

  &__empty {
    text-align: center;
    padding: 32px;
    color: #666;

    p {
      margin-bottom: 16px;
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
    width: 40px;
    background: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;

    &.sidebar-exclusion {
      background: #ff6b6b;
    }

    .sidebar-label {
      color: white;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  }
}

.query-filter-condition {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
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