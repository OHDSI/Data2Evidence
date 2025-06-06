<script lang="ts">
export default {
  name: 'QueryFilterCard',
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterCardModel, QueryFilterChip as QueryFilterChipType, QueryFilterCondition } from '../models/QueryFilterModel'
import QueryFilterChip from './QueryFilterChip.vue'
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

// Get all conditions that are related to a nested condition (for AttributesDropdown)
const getNestedConditionGroup = (conditionId: string) => {
  const relatedConditions: QueryFilterCondition[] = []
  
  // Find all conditions in nested structures that are related to this condition
  props.filter.conditions.forEach(condition => {
    if (condition.isNested && condition.nestedConditions) {
      condition.nestedConditions.forEach(nestedCond => {
        if (nestedCond.id === conditionId) {
          // Add the condition itself
          relatedConditions.push(nestedCond)
        }
        // Add any attribute-based conditions that belong to this condition
        if (nestedCond.isAttributeBased && nestedCond.parentConditionId === conditionId) {
          relatedConditions.push(nestedCond)
        }
      })
    }
  })
  
  return relatedConditions
}

// Group nested conditions by their parent relationships
const getNestedConditionGroups = (nestedContainer: QueryFilterCondition) => {
  if (!nestedContainer.nestedConditions) return []
  
  const groups: Array<{
    parent: QueryFilterCondition,
    attributes: QueryFilterCondition[]
  }> = []
  
  // Find all parent conditions (non-attribute-based) in the nested structure
  const parentConditions = nestedContainer.nestedConditions.filter(c => !c.isAttributeBased)
  
  parentConditions.forEach(parent => {
    const attributeConditions = nestedContainer.nestedConditions?.filter(c => 
      c.isAttributeBased && c.parentConditionId === parent.id
    ) || []
    
    groups.push({
      parent,
      attributes: attributeConditions
    })
  })
  
  return groups
}

// Handle nested criteria selection
const handleNestedCriteriaSelected = (nestedConditionId: string, option: CriteriaOption) => {
  const newCondition = props.filter.addNestedCondition(nestedConditionId, {
    conceptSet: option.title,
    criteriaType: option.id,
    chips: []
  })
  emit('update:filter', props.filter)
  // Don't emit add-condition for nested conditions - they're handled internally
}

// Handle nested condition removal
const removeNestedCondition = (nestedConditionId: string, conditionId: string) => {
  const removed = props.filter.removeNestedCondition(nestedConditionId, conditionId)
  if (removed) {
    emit('update:filter', props.filter)
    emit('remove-condition', props.filter.id, conditionId)
  }
}

// Handle attribute selection for nested conditions
const handleNestedAttributeSelected = (conditionId: string, attribute: AttributeConfig & { category: string }) => {
  // Use the new nested attribute handling
  const newCondition = props.filter.addNestedAttributeCondition(conditionId, attribute)
  emit('update:filter', props.filter)
  emit('attribute-selected', props.filter.id, conditionId, attribute, newCondition.id)
}

const handleNestedAttributeRemoved = (conditionId: string, attributeId: string) => {
  // Find and remove the attribute-based condition from nested structures
  props.filter.conditions.forEach(condition => {
    if (condition.isNested && condition.nestedConditions) {
      const attributeConditionIndex = condition.nestedConditions.findIndex(c => 
        c.isAttributeBased && 
        c.parentConditionId === conditionId && 
        c.attributeConfig?.id === attributeId
      )
      
      if (attributeConditionIndex > -1) {
        condition.nestedConditions.splice(attributeConditionIndex, 1)
        emit('update:filter', props.filter)
        emit('attribute-removed', props.filter.id, conditionId, attributeId)
      }
    }
  })
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
          :class="{ 'query-filter-condition--nested': attrCondition.isNested }"
        >
          <div class="query-filter-condition__header">
            <span class="query-filter-condition__label query-filter-condition__label--attribute">
              {{ attrCondition.conceptSet }}
            </span>
            <div class="query-filter-condition__actions">
              <button
                v-if="!attrCondition.isNested"
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

          <!-- Regular attribute condition chips -->
          <div v-if="!attrCondition.isNested" class="query-filter-condition__chips">
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

          <!-- Nested criteria content -->
          <div v-if="attrCondition.isNested" class="query-filter-condition__nested-content">
            <!-- Add event button for nested criteria -->
            <div class="nested-add-event-container">
              <criteria-selector-dropdown
                section-id="initialEvents"
                button-text="Add event"
                @criteria-selected="(option) => handleNestedCriteriaSelected(attrCondition.id, option)"
              />
            </div>

            <!-- Nested conditions grouped by parent -->
            <div 
              v-for="nestedGroup in getNestedConditionGroups(attrCondition)"
              :key="nestedGroup.parent.id"
              class="query-filter-nested-group"
            >
              <!-- Parent nested condition -->
              <div class="query-filter-nested-condition query-filter-nested-condition--parent">
                <div class="query-filter-nested-condition__header">
                  <span class="query-filter-nested-condition__label">
                    {{ nestedGroup.parent.conceptSet || 'Nested Condition' }}
                  </span>
                  <div class="query-filter-nested-condition__actions">
                    <button
                      class="btn-icon"
                      @click="editCondition(nestedGroup.parent.id)"
                      aria-label="Edit nested condition"
                      title="Edit nested condition"
                    >
                      <i class="icon icon-pencil"></i>
                    </button>
                    <button
                      class="btn-icon"
                      @click="duplicateCondition(nestedGroup.parent.id)"
                      aria-label="Duplicate nested condition"
                      title="Duplicate nested condition"
                    >
                      <i class="icon icon-copy"></i>
                    </button>
                    <attributes-dropdown
                      :criteria-type="nestedGroup.parent.criteriaType || 'conditionOccurrence'"
                      :condition-id="nestedGroup.parent.id"
                      :all-conditions="getNestedConditionGroup(nestedGroup.parent.id)"
                      @attribute-selected="(attr) => handleNestedAttributeSelected(nestedGroup.parent.id, attr)"
                      @attribute-removed="(attrId) => handleNestedAttributeRemoved(nestedGroup.parent.id, attrId)"
                    />
                    <button
                      class="btn-remove-condition"
                      @click="removeNestedCondition(attrCondition.id, nestedGroup.parent.id)"
                      aria-label="Remove nested condition"
                      title="Remove nested condition"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div class="query-filter-nested-condition__chips">
                  <query-filter-chip
                    v-for="chip in nestedGroup.parent.chips"
                    :key="chip.id"
                    :chip="chip"
                    :removable="true"
                    @remove="removeChip(nestedGroup.parent.id, chip.id)"
                  />
                  <button class="btn-add-chip" @click="addChip(nestedGroup.parent.id)" aria-label="Add filter">
                    <i class="icon icon-plus"></i>
                  </button>
                </div>
              </div>

              <!-- Nested attribute conditions -->
              <div
                v-for="attrCond in nestedGroup.attributes"
                :key="attrCond.id"
                class="query-filter-nested-condition query-filter-nested-condition--attribute"
              >
                <div class="query-filter-nested-condition__header">
                  <span class="query-filter-nested-condition__label query-filter-nested-condition__label--attribute">
                    {{ attrCond.conceptSet }}
                  </span>
                  <div class="query-filter-nested-condition__actions">
                    <button
                      v-if="!attrCond.isNested"
                      class="btn-icon"
                      @click="editCondition(attrCond.id)"
                      aria-label="Edit nested attribute condition"
                      title="Edit nested attribute condition"
                    >
                      <i class="icon icon-pencil"></i>
                    </button>
                    <button
                      class="btn-remove-condition"
                      @click="removeNestedCondition(attrCondition.id, attrCond.id)"
                      aria-label="Remove nested attribute condition"
                      title="Remove nested attribute condition"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <!-- Regular attribute condition chips -->
                <div v-if="!attrCond.isNested" class="query-filter-nested-condition__chips">
                  <query-filter-chip
                    v-for="chip in attrCond.chips"
                    :key="chip.id"
                    :chip="chip"
                    :removable="true"
                    @remove="removeChip(attrCond.id, chip.id)"
                  />
                  <button class="btn-add-chip" @click="addChip(attrCond.id)" aria-label="Add filter">
                    <i class="icon icon-plus"></i>
                  </button>
                </div>

                <!-- Recursively nested criteria (if this attribute is itself nested) -->
                <div v-if="attrCond.isNested" class="query-filter-nested-condition__nested-content">
                  <!-- Add event button for deeply nested criteria -->
                  <div class="nested-add-event-container">
                    <criteria-selector-dropdown
                      section-id="initialEvents"
                      button-text="Add event"
                      @criteria-selected="(option) => handleNestedCriteriaSelected(attrCond.id, option)"
                    />
                  </div>

                  <!-- Show any conditions inside this deeply nested criteria -->
                  <div v-if="!attrCond.nestedConditions?.length" class="nested-empty-state">
                    <p>No nested conditions added yet</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty state for nested criteria -->
            <div v-if="!attrCondition.nestedConditions?.length" class="nested-empty-state">
              <p>No nested conditions added yet</p>
            </div>
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
@import '../styles/QueryFilterCardStyles';
</style>
