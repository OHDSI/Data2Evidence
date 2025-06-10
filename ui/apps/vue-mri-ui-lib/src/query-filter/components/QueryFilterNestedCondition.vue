<script lang="ts">
export default {
  name: 'QueryFilterNestedCondition',
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterCondition } from '../models/QueryFilterModel'
import QueryFilterChip from './QueryFilterChip.vue'
import AttributesDropdown from './AttributesDropdown.vue'
import CriteriaSelectorDropdown from './CriteriaSelectorDropdown.vue'
import { type AttributeConfig, type CriteriaOption } from '../utils/CriteriaConfigLoader'

const props = defineProps<{
  condition: QueryFilterCondition
  parentConditionId?: string
  level?: number
}>()

const emit = defineEmits([
  'edit-condition',
  'duplicate-condition',
  'remove-condition',
  'add-chip',
  'remove-chip',
  'attribute-selected',
  'attribute-removed',
  'criteria-selected',
])

const currentLevel = computed(() => props.level || 0)

// Group nested conditions by their parent relationships
const nestedConditionGroups = computed(() => {
  if (!props.condition.nestedConditions) return []

  const groups: Array<{
    parent: QueryFilterCondition
    attributes: QueryFilterCondition[]
  }> = []

  // Find all parent conditions (non-attribute-based) in the nested structure
  const parentConditions = props.condition.nestedConditions.filter(c => !c.isAttributeBased)

  parentConditions.forEach(parent => {
    const attributeConditions =
      props.condition.nestedConditions?.filter(c => c.isAttributeBased && c.parentConditionId === parent.id) || []

    groups.push({
      parent,
      attributes: attributeConditions,
    })
  })

  return groups
})

// Get all conditions that are related to a nested condition (for AttributesDropdown)
const getNestedConditionGroup = (conditionId: string) => {
  const relatedConditions: QueryFilterCondition[] = []

  if (props.condition.nestedConditions) {
    props.condition.nestedConditions.forEach(nestedCond => {
      if (nestedCond.id === conditionId) {
        relatedConditions.push(nestedCond)
      }
      if (nestedCond.isAttributeBased && nestedCond.parentConditionId === conditionId) {
        relatedConditions.push(nestedCond)
      }
    })
  }

  return relatedConditions
}

// Event handlers - these all bubble up to the parent component
const handleEditCondition = (conditionId: string) => {
  emit('edit-condition', conditionId)
}

const handleDuplicateCondition = (conditionId: string) => {
  emit('duplicate-condition', conditionId)
}

const handleRemoveCondition = (conditionId: string) => {
  emit('remove-condition', props.condition.id, conditionId)
}

const handleAddChip = (conditionId: string) => {
  emit('add-chip', conditionId)
}

const handleRemoveChip = (conditionId: string, chipId: string) => {
  emit('remove-chip', conditionId, chipId)
}

const handleAttributeSelected = (conditionId: string, attribute: AttributeConfig & { category: string }) => {
  emit('attribute-selected', conditionId, attribute)
}

const handleAttributeRemoved = (conditionId: string, attributeId: string) => {
  emit('attribute-removed', conditionId, attributeId)
}

const handleCriteriaSelected = (option: CriteriaOption) => {
  emit('criteria-selected', props.condition.id, option)
}
</script>

<template>
  <div class="query-filter-nested-condition" :class="`query-filter-nested-condition--level-${currentLevel}`">
    <!-- Handle regular nested conditions (not deeply nested) -->
    <template v-if="!condition.isNested">
      <div>{{ condition.id }}</div>
      <div class="query-filter-nested-condition__header">
        <span class="query-filter-nested-condition__label">
          {{ condition.conceptSet || 'Nested Condition' }}
        </span>
        <div class="query-filter-nested-condition__actions">
          <button
            class="btn-icon"
            @click="handleEditCondition(condition.id)"
            aria-label="Edit nested condition"
            title="Edit nested condition"
          >
            <i class="icon icon-pencil"></i>
          </button>
          <button
            class="btn-icon"
            @click="handleDuplicateCondition(condition.id)"
            aria-label="Duplicate nested condition"
            title="Duplicate nested condition"
          >
            <i class="icon icon-copy"></i>
          </button>
          <attributes-dropdown
            :criteria-type="condition.criteriaType || 'conditionOccurrence'"
            :condition-id="condition.id"
            :all-conditions="getNestedConditionGroup(condition.id)"
            @attribute-selected="attr => handleAttributeSelected(condition.id, attr)"
            @attribute-removed="attrId => handleAttributeRemoved(condition.id, attrId)"
          />
          <button
            class="btn-remove-condition"
            @click="handleRemoveCondition(condition.id)"
            aria-label="Remove nested condition"
            title="Remove nested condition"
          >
            ×
          </button>
        </div>
      </div>

      <div class="query-filter-nested-condition__chips">
        <query-filter-chip
          v-for="chip in condition.chips"
          :key="chip.id"
          :chip="chip"
          :removable="true"
          @remove="handleRemoveChip(condition.id, chip.id)"
        />
        <button class="btn-add-chip" @click="handleAddChip(condition.id)" aria-label="Add filter">
          <i class="icon icon-plus"></i>
        </button>
      </div>
    </template>

    <!-- Handle deeply nested conditions (recursive case) -->
    <template v-else>
      <div class="query-filter-nested-condition__nested-content">
        <div>JEROME</div>
        <div>{{ condition.id }}</div>
        <!-- Add event button for nested criteria -->
        <div class="nested-add-event-container">
          <criteria-selector-dropdown
            section-id="initialEvents"
            button-text="Add event"
            @criteria-selected="handleCriteriaSelected"
          />
        </div>

        <!-- Recursive rendering of nested conditions -->
        <query-filter-nested-condition
          v-for="nestedCondition in condition.nestedConditions"
          :key="nestedCondition.id"
          :condition="nestedCondition"
          :parent-condition-id="condition.id"
          :level="currentLevel + 1"
          :class="{ 'query-filter-nested-condition--attribute': nestedCondition.isAttributeBased }"
          @edit-condition="handleEditCondition"
          @duplicate-condition="handleDuplicateCondition"
          @remove-condition="handleRemoveCondition"
          @add-chip="handleAddChip"
          @remove-chip="handleRemoveChip"
          @attribute-selected="(conditionId, attribute) => emit('attribute-selected', conditionId, attribute)"
          @attribute-removed="(conditionId, attributeId) => emit('attribute-removed', conditionId, attributeId)"
          @criteria-selected="(targetId, option) => emit('criteria-selected', targetId, option)"
        />

        <!-- Empty state for nested criteria -->
        <div v-if="!condition.nestedConditions?.length" class="nested-empty-state">
          <p>No nested conditions added yet</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-nested-condition {
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
    .query-filter-nested-condition__label {
      font-style: italic;
      color: #666;
    }
  }
}

.query-filter-nested-condition__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.query-filter-nested-condition__label {
  font-weight: 500;
  color: #333;

  &--attribute {
    font-style: italic;
    color: #666;
  }
}

.query-filter-nested-condition__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.query-filter-nested-condition__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}

.query-filter-nested-condition__nested-content {
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

.btn-remove-condition {
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

