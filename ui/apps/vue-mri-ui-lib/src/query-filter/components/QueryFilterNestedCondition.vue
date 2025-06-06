<script lang="ts">
export default {
  name: 'QueryFilterNestedCondition',
}
</script>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { QueryFilterCondition, QueryFilterChip as QueryFilterChipType } from '../models/QueryFilterModel'
import QueryFilterChip from './QueryFilterChip.vue'
import AttributesDropdown from './AttributesDropdown.vue'
import { type AttributeConfig } from '../utils/CriteriaConfigLoader'

const props = defineProps<{
  condition: QueryFilterCondition
  isParent?: boolean
  isAttribute?: boolean
  allConditions: QueryFilterCondition[]
}>()

const emit = defineEmits([
  'edit',
  'duplicate',
  'remove',
  'add-chip',
  'remove-chip',
  'attribute-selected',
  'attribute-removed'
])

const handleAttributeSelected = (attribute: AttributeConfig & { category: string }) => {
  emit('attribute-selected', props.condition.id, attribute)
}

const handleAttributeRemoved = (attributeId: string) => {
  emit('attribute-removed', props.condition.id, attributeId)
}
</script>

<template>
  <div
    class="query-filter-nested-condition"
    :class="{
      'query-filter-nested-condition--parent': isParent,
      'query-filter-nested-condition--attribute': isAttribute
    }"
  >
    <div class="query-filter-nested-condition__header">
      <span 
        class="query-filter-nested-condition__label"
        :class="{ 'query-filter-nested-condition__label--attribute': isAttribute }"
      >
        {{ condition.conceptSet || 'Nested Condition' }}
      </span>
      <div class="query-filter-nested-condition__actions">
        <button
          class="btn-icon"
          @click="$emit('edit', condition.id)"
          aria-label="Edit nested condition"
          title="Edit nested condition"
        >
          <i class="icon icon-pencil"></i>
        </button>
        <button
          v-if="isParent"
          class="btn-icon"
          @click="$emit('duplicate', condition.id)"
          aria-label="Duplicate nested condition"
          title="Duplicate nested condition"
        >
          <i class="icon icon-copy"></i>
        </button>
        <attributes-dropdown
          v-if="isParent"
          :criteria-type="condition.criteriaType || 'conditionOccurrence'"
          :condition-id="condition.id"
          :all-conditions="allConditions"
          @attribute-selected="handleAttributeSelected"
          @attribute-removed="handleAttributeRemoved"
        />
        <button
          class="btn-remove-condition"
          @click="$emit('remove', condition.id)"
          aria-label="Remove nested condition"
          title="Remove nested condition"
        >
          ×
        </button>
      </div>
    </div>

    <div v-if="!condition.isNested" class="query-filter-nested-condition__chips">
      <query-filter-chip
        v-for="chip in condition.chips"
        :key="chip.id"
        :chip="chip"
        :removable="true"
        @remove="$emit('remove-chip', condition.id, chip.id)"
      />
      <button class="btn-add-chip" @click="$emit('add-chip', condition.id)" aria-label="Add filter">
        <i class="icon icon-plus"></i>
      </button>
    </div>

    <slot name="nested-content"></slot>
  </div>
</template>

<style lang="scss" scoped>
@import '../styles/QueryFilterNestedCondition';
</style>