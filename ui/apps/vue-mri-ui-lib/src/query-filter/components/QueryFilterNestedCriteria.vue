<script lang="ts">
export default {
  name: 'QueryFilterNestedCriteria',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import QueryFilterCriteriaGroup from './QueryFilterCriteriaGroup.vue'
import type { ConceptSetItemDisplay, ConceptSetDomainValues } from '../types/ConceptSetTypes'
import type { QueryFilterGroup, QueryFilterEvent } from '../types/QueryFilterTypes'

export interface NestedCriteria {
  id: string
  criteriaType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  events: QueryFilterEvent[]
}

interface Props {
  nestedCriteria: NestedCriteria
  conceptSets?: ConceptSetItemDisplay[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  datasetId?: string | null
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
  'concept-set-action': [action: any]
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
      :concept-set-domain-values="
        conceptSetDomainValues || { values: [], isLoading: false, loadedStatus: 'NO_RESULTS' }
      "
      :concept-set-texts="conceptSetTexts || {}"
      :dataset-id="datasetId || null"
      :readonly="readonly"
      :hide-header="true"
      @update-group="handleGroupUpdate"
      @remove-group="handleGroupRemove"
      @concept-set-action="action => $emit('concept-set-action', action)"
    />
  </div>
</template>
