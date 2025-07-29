<script lang="ts">
export default {
  name: 'QueryFilterNestedEvent',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import QueryFilterEventCard from './QueryFilterEventCard.vue'
import QueryFilterNestedCriteria from './QueryFilterNestedCriteria.vue'
import type { QueryFilterEvent } from '../models/QueryFilterModel'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'

interface Props {
  event: QueryFilterEvent
  parentEventId?: string
  level?: number
  operator?: 'OR' | 'AND'
  conceptSets?: ConceptSetItem[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  operator: 'AND',
  conceptSets: () => [],
  readonly: false,
})

const emit = defineEmits<{
  'update:event': [event: QueryFilterEvent]
  'remove-event': []
  'duplicate-event': []
  'concept-set-selected': [conceptSet: ConceptSetItem | null]
  'attribute-selected': [attribute: any]
  'attribute-removed': [attributeId: string]
}>()

// Check if this event has nested criteria
const hasNestedCriteria = computed(() => {
  return props.event.attributes?.some(attr => attr.attributeType === 'nested')
})

// Get nested criteria from the first nested attribute
const nestedCriteria = computed(() => {
  const nestedAttribute = props.event.attributes?.find(attr => attr.attributeType === 'nested')
  return nestedAttribute?.nestedCriteria
})

// Handle event updates
const handleEventUpdate = (updatedEvent: QueryFilterEvent) => {
  emit('update:event', updatedEvent)
}

// Handle event removal
const handleEventRemove = () => {
  emit('remove-event')
}

// Handle event duplication
const handleEventDuplicate = () => {
  emit('duplicate-event')
}

// Handle concept set selection
const handleConceptSetSelected = (conceptSet: ConceptSetItem | null) => {
  emit('concept-set-selected', conceptSet)
}

// Handle attribute selection
const handleAttributeSelected = (attribute: any) => {
  emit('attribute-selected', attribute)
}

// Handle attribute removal
const handleAttributeRemoved = (attributeId: string) => {
  emit('attribute-removed', attributeId)
}

// Handle nested criteria updates
const handleNestedCriteriaUpdate = (updatedCriteria: any) => {
  if (props.event.attributes) {
    const nestedAttribute = props.event.attributes.find(attr => attr.attributeType === 'nested')
    if (nestedAttribute) {
      nestedAttribute.nestedCriteria = updatedCriteria
      emit('update:event', { ...props.event })
    }
  }
}

// Get visual styling based on level
const getLevelStyle = computed(() => ({
  marginLeft: `${props.level * 16}px`,
  borderLeft: props.level > 0 ? `2px solid #1976d2` : 'none',
  paddingLeft: props.level > 0 ? '12px' : '0',
}))

// Get operator display
const getOperatorDisplay = computed(() => {
  return props.operator === 'OR' ? 'ANY' : 'ALL'
})
</script>

<template>
  <div class="query-filter-nested-event" :class="`query-filter-nested-event--level-${level}`" :style="getLevelStyle">
    <!-- Level indicator for nested events -->
    <div v-if="level > 0" class="nested-level-indicator">
      <span class="level-label">Level {{ level }}</span>
      <span class="operator-label">{{ getOperatorDisplay }}</span>
    </div>

    <!-- Main event card -->
    <QueryFilterEventCard
      :event="event"
      :event-index="0"
      :concept-sets="conceptSets"
      :concept-set-domain-values="
        conceptSetDomainValues || { values: [], isLoading: false, loadedStatus: 'NO_RESULTS' }
      "
      :concept-set-texts="conceptSetTexts || {}"
      :nested-level="level"
      :readonly="readonly"
      @update:event="handleEventUpdate"
      @remove-event="handleEventRemove"
      @duplicate-event="handleEventDuplicate"
      @concept-set-selected="handleConceptSetSelected"
      @attribute-selected="handleAttributeSelected"
      @attribute-removed="handleAttributeRemoved"
    />

    <!-- Nested criteria (recursive) -->
    <div v-if="hasNestedCriteria && nestedCriteria" class="nested-criteria-container">
      <QueryFilterNestedCriteria
        :nested-criteria="nestedCriteria"
        :level="level + 1"
        :concept-sets="conceptSets"
        :concept-set-domain-values="
          conceptSetDomainValues || { values: [], isLoading: false, loadedStatus: 'NO_RESULTS' }
        "
        :concept-set-texts="conceptSetTexts || {}"
        :readonly="readonly"
        @update:nested-criteria="handleNestedCriteriaUpdate"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-nested-event {
  margin-bottom: 8px;

  &--level-0 {
    border: 1px solid #e0e0e0;
  }

  &--level-1 {
    background: rgba(25, 118, 210, 0.02);
    border-radius: 4px;
    padding: 8px;
  }

  &--level-2 {
    background: rgba(25, 118, 210, 0.04);
    border-radius: 4px;
    padding: 8px;
  }

  .nested-level-indicator {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    padding: 4px 8px;
    background: rgba(25, 118, 210, 0.1);
    border-radius: 4px;
    font-size: 12px;

    .level-label {
      color: #1976d2;
      font-weight: 600;
    }

    .operator-label {
      color: #666;
      font-weight: 500;
      padding: 2px 6px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 3px;
    }
  }

  .nested-criteria-container {
    margin-top: 8px;
    border-top: 1px solid rgba(25, 118, 210, 0.2);
    padding-top: 8px;
  }
}
</style>
