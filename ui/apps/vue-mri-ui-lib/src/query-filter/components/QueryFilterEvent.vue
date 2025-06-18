<script lang="ts">
export default {
  name: 'QueryFilterEvent',
}
</script>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { QueryFilterEvent } from '../models/QueryFilterModel'
import AttributesDropdown from './AttributesDropdown.vue'
import { type AttributeConfig } from '../utils/CriteriaConfigLoader'

const props = defineProps<{
  condition: QueryFilterEvent
  isParent?: boolean
  isAttribute?: boolean
  isNested?: boolean
  allConditions: QueryFilterEvent[]
  showRemoveButton?: boolean
}>()

const emit = defineEmits(['edit', 'duplicate', 'remove', 'attribute-selected', 'attribute-removed'])

const handleAttributeSelected = (attribute: AttributeConfig & { category: string }) => {
  emit('attribute-selected', props.condition.id, attribute)
}

const handleAttributeRemoved = (attributeId: string) => {
  emit('attribute-removed', props.condition.id, attributeId)
}
</script>

<template>
  <div
    class="query-filter-condition"
    :class="{
      'query-filter-condition--parent': isParent,
      'query-filter-condition--attribute': isAttribute,
      'query-filter-condition--nested': isNested,
    }"
  >
    <div class="query-filter-condition__header">
      <span class="query-filter-condition__label" :class="{ 'query-filter-condition__label--attribute': isAttribute }">
        {{ condition.conceptSet || 'Condition concept set' }}
      </span>
      <div class="query-filter-condition__actions">
        <button
          v-if="!isNested"
          class="btn-icon"
          @click="$emit('edit', condition.id)"
          aria-label="Edit condition"
          title="Edit condition"
        >
          <i class="icon icon-pencil"></i>
        </button>
        <button
          v-if="isParent"
          class="btn-icon"
          @click="$emit('duplicate', condition.id)"
          aria-label="Duplicate condition"
          title="Duplicate condition"
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
          v-if="showRemoveButton"
          class="btn-remove-condition"
          @click="$emit('remove', condition.id)"
          aria-label="Remove condition"
          title="Remove condition"
        >
          ×
        </button>
      </div>
    </div>

    <slot name="nested-content"></slot>
  </div>
</template>

<style lang="scss" scoped>
@import '../styles/QueryFilterEvent';
</style>
