<script lang="ts">
export default {
  name: 'QueryFilterCard',
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterCardModel, QueryFilterChip as QueryFilterChipType, QueryFilterCondition } from './QueryFilterModel'
import QueryFilterChip from './QueryFilterChip.vue'
import AttributesDropdown from './AttributesDropdown.vue'
import { type AttributeConfig } from './CriteriaConfigLoader'

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
  'attribute-selected',
  'attribute-removed',
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

const toggleOperator = () => {
  props.filter.operator = props.filter.operator === 'OR' ? 'AND' : 'OR'
  emit('update:filter', props.filter)
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

// Handle attribute selection and removal
const handleAttributeSelected = (conditionId: string, attribute: AttributeConfig & { category: string }) => {
  // Create a new attribute-based condition instead of just tracking selection
  const newCondition = props.filter.addAttributeCondition(conditionId, attribute)
  emit('update:filter', props.filter)
  emit('attribute-selected', props.filter.id, conditionId, attribute, newCondition.id)
}

const handleAttributeRemoved = (conditionId: string, attributeId: string) => {
  // Find and remove the attribute-based condition with this attributeId
  const attributeCondition = props.filter.conditions.find(c => 
    c.isAttributeBased && 
    c.parentConditionId === conditionId && 
    c.attributeConfig?.id === attributeId
  )
  
  if (attributeCondition) {
    const removed = props.filter.removeCondition(attributeCondition.id)
    if (removed) {
      emit('update:filter', props.filter)
      emit('attribute-removed', props.filter.id, conditionId, attributeId)
    }
  }
}

// Group conditions by their parent relationships
const conditionGroups = computed(() => {
  const groups: Array<{
    parentCondition: QueryFilterCondition,
    attributeConditions: QueryFilterCondition[]
  }> = []
  
  // Find all parent conditions (non-attribute-based)
  const parentConditions = props.filter.conditions.filter(c => !c.isAttributeBased)
  
  parentConditions.forEach(parent => {
    const attributeConditions = props.filter.conditions.filter(c => c.parentConditionId === parent.id)
    groups.push({
      parentCondition: parent,
      attributeConditions
    })
  })
  
  return groups
})

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
        
        <button
          class="btn-remove-filter"
          @click="removeFilter"
          aria-label="Remove filter"
          title="Remove filter"
        >
          ×
        </button>
      </div>
    </div>

    <div v-if="filter.isExpanded" class="query-filter-card__content">
      <!-- ANY/ALL sidebar positioned relative to content -->
      <div
        v-if="filter.conditions.length > 1"
        class="query-filter-card__content-sidebar"
        :class="{ 
          'content-sidebar-any': filter.operator === 'OR',
          'content-sidebar-all': filter.operator === 'AND'
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
        v-for="(group, groupIndex) in conditionGroups"
        :key="group.parentCondition.id"
        class="query-filter-condition-group"
      >
        <!-- At least 1 sidebar that spans the parent condition and all its attributes -->
        <div class="query-filter-condition__at-least-group">
          <span>At least 1</span>
        </div>

        <!-- Parent condition -->
        <div
          class="query-filter-condition query-filter-condition--parent"
          :class="{ 'has-nested': filter.conditions.length > 1 }"
        >
          <div class="query-filter-condition__header">
            <span class="query-filter-condition__label">
              {{ group.parentCondition.conceptSet || 'Condition concept set' }}
            </span>
            <div class="query-filter-condition__actions">
              <button
                class="btn-icon"
                @click="editCondition(group.parentCondition.id)"
                aria-label="Edit condition"
                title="Edit condition"
              >
                <i class="icon icon-pencil"></i>
              </button>
              <button
                class="btn-icon"
                @click="duplicateCondition(group.parentCondition.id)"
                aria-label="Duplicate condition"
                title="Duplicate condition"
              >
                <i class="icon icon-copy"></i>
              </button>
              <attributes-dropdown
                :criteria-type="group.parentCondition.criteriaType || 'conditionOccurrence'"
                :condition-id="group.parentCondition.id"
                :all-conditions="filter.conditions"
                @attribute-selected="(attr) => handleAttributeSelected(group.parentCondition.id, attr)"
                @attribute-removed="(attrId) => handleAttributeRemoved(group.parentCondition.id, attrId)"
              />
              <!-- No remove button for parent conditions -->
            </div>
          </div>

          <div class="query-filter-condition__chips">
            <query-filter-chip
              v-for="chip in group.parentCondition.chips"
              :key="chip.id"
              :chip="chip"
              :removable="true"
              @remove="removeChip(group.parentCondition.id, chip.id)"
            />
            <button class="btn-add-chip" @click="addChip(group.parentCondition.id)" aria-label="Add filter">
              <i class="icon icon-plus"></i>
            </button>
          </div>
        </div>

        <!-- Attribute-based conditions -->
        <div
          v-for="attrCondition in group.attributeConditions"
          :key="attrCondition.id"
          class="query-filter-condition query-filter-condition--attribute"
        >
          <div class="query-filter-condition__header">
            <span class="query-filter-condition__label query-filter-condition__label--attribute">
              {{ attrCondition.conceptSet }}
            </span>
            <div class="query-filter-condition__actions">
              <button
                class="btn-icon"
                @click="editCondition(attrCondition.id)"
                aria-label="Edit attribute condition"
                title="Edit attribute condition"
              >
                <i class="icon icon-pencil"></i>
              </button>
              <button
                class="btn-remove-condition"
                @click="removeCondition(attrCondition.id)"
                aria-label="Remove attribute condition"
                title="Remove attribute condition"
              >
                ×
              </button>
            </div>
          </div>

          <div class="query-filter-condition__chips">
            <query-filter-chip
              v-for="chip in attrCondition.chips"
              :key="chip.id"
              :chip="chip"
              :removable="true"
              @remove="removeChip(attrCondition.id, chip.id)"
            />
            <button class="btn-add-chip" @click="addChip(attrCondition.id)" aria-label="Add filter">
              <i class="icon icon-plus"></i>
            </button>
          </div>
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
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: sideways-lr;
    text-orientation: mixed;
    border-radius: 0 0 0 6px;

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

.query-filter-condition-group {
  position: relative;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  .query-filter-condition__at-least-group {
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

  &--parent {
    // Parent condition styles
    background: #f9fafb;
  }

  &--attribute {
    // Attribute condition styles - slightly different to distinguish
    background: #f3f4f6;
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

    &--attribute {
      // Same styling as regular concept set labels
      color: #666;
      font-weight: normal;
      font-style: normal;
    }
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

.btn-remove-condition {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: #dc2626;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 16px;
  font-weight: bold;
  line-height: 1;

  &:hover {
    background: #fee2e2;
    color: #b91c1c;
  }
}

.btn-remove-filter {
  background: none;
  border: none;
  padding: 6px 8px;
  cursor: pointer;
  color: #dc2626;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  margin-left: auto;

  &:hover {
    background: #fee2e2;
    color: #b91c1c;
  }
}
</style>
