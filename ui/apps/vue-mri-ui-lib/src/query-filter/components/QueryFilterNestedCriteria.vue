<script lang="ts">
export default {
  name: 'QueryFilterNestedCriteria',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import QueryFilterCriteriaGroup from './QueryFilterCriteriaGroup.vue'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'
import type { QueryFilterGroup } from '../models/QueryFilterModel'

interface NestedCriteria {
  id: string
  criteriaType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  events: any[]
}

interface Props {
  nestedCriteria: NestedCriteria
  conceptSets?: ConceptSetItem[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  readonly?: boolean
  hideHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  conceptSets: () => [],
  readonly: false,
  hideHeader: false,
})

const emit = defineEmits<{
  'update:nestedCriteria': [criteria: NestedCriteria]
  'remove-nested': []
}>()

// Convert NestedCriteria to QueryFilterGroup format
const groupData = computed<QueryFilterGroup>({
  get: () => ({
    id: props.nestedCriteria.id,
    title: props.hideHeader ? '' : 'Nested Criteria',
    description: '',
    criteriaType: props.nestedCriteria.criteriaType,
    events: props.nestedCriteria.events,
  }),
  set: (value: QueryFilterGroup) => {
    const updatedCriteria: NestedCriteria = {
      id: value.id,
      criteriaType: value.criteriaType,
      events: value.events,
    }
    emit('update:nestedCriteria', updatedCriteria)
  },
})

// Handle group updates from QueryFilterCriteriaGroup
const handleGroupUpdate = (updatedGroup: QueryFilterGroup) => {
  groupData.value = updatedGroup
}

// Handle group removal
const handleGroupRemove = () => {
  emit('remove-nested')
}
</script>

<template>
  <div class="query-filter-nested-criteria">
    <!-- Use QueryFilterCriteriaGroup recursively for consistency -->
    <QueryFilterCriteriaGroup
      :group="groupData"
      :group-index="0"
      :concept-sets="conceptSets"
      :concept-set-domain-values="conceptSetDomainValues"
      :concept-set-texts="conceptSetTexts"
      :readonly="readonly"
      :hide-header="true"
      @update-group="handleGroupUpdate"
      @remove-group="handleGroupRemove"
    />
  </div>
</template>
