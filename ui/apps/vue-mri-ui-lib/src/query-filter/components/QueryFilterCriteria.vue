<script lang="ts">
export default {
  name: 'QueryFilterCriteria',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import QueryFilterCriteriaGroup from './QueryFilterCriteriaGroup.vue'
import { QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'

interface Props {
  criteriaData?: any
  conceptSets?: ConceptSetItem[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  criteriaData: () => ({ criteriaType: 'ALL', criteria: [] }),
  conceptSets: () => [],
  readonly: false,
})

const emit = defineEmits<{
  'update:criteria': [criteria: any]
  'criteria-updated': [criteriaManager: QueryFilterCriteriaManager]
  'update-qualifying-limit': [limit: 'ALL' | 'EARLIEST' | 'LATEST']
  'add-criteria-group': [groupData: any]
  'update-criteria-group': [index: number, groupData: any]
  'remove-criteria-group': [index: number]
}>()

// Get current criteria data (now from props instead of criteriaManager)
const currentCriteriaData = computed(() => props.criteriaData)

// Handle qualifying events limit selection
const updateQualifyingLimit = (limit: 'ALL' | 'EARLIEST' | 'LATEST') => {
  emit('update-qualifying-limit', limit)
}

// Handle adding new criteria group
const addNewGroup = () => {
  const newGroup = {
    id: `criteria_${Date.now()}`,
    title: `Criteria ${currentCriteriaData.value.criteria.length + 1}`,
    description: `Description for Criteria ${currentCriteriaData.value.criteria.length + 1}`,
    criteriaType: 'ALL' as 'ALL',
    events: [],
  }

  emit('add-criteria-group', newGroup)
}

// Handle group updates
const handleGroupUpdate = (groupIndex: number, updatedGroup: any) => {
  emit('update-criteria-group', groupIndex, updatedGroup)
}

// Handle group removal
const handleGroupRemove = (groupIndex: number) => {
  emit('remove-criteria-group', groupIndex)
}
</script>

<template>
  <div class="query-filter-criteria">
    <!-- Qualifying Events Limit Controls -->
    <div class="criteria-header">
      <h3 class="criteria-title">Inclusion Criteria</h3>

      <div class="qualifying-events-controls">
        <button
          v-for="limit in ['ALL', 'EARLIEST', 'LATEST']"
          :key="limit"
          class="qualifying-events-btn"
          :class="{
            'qualifying-events-btn--active': currentCriteriaData.criteriaType === limit,
            'qualifying-events-btn--readonly': readonly,
          }"
          :disabled="readonly"
          @click="updateQualifyingLimit(limit as 'ALL' | 'EARLIEST' | 'LATEST')"
        >
          {{ limit }}
        </button>
      </div>
    </div>

    <!-- Criteria Groups -->
    <div class="criteria-groups">
      <QueryFilterCriteriaGroup
        v-for="(group, index) in currentCriteriaData.criteria"
        :key="group.id"
        :group="group"
        :group-index="index"
        :concept-sets="conceptSets"
        :concept-set-domain-values="conceptSetDomainValues"
        :concept-set-texts="conceptSetTexts"
        :readonly="readonly"
        @update-group="handleGroupUpdate(index, $event)"
        @remove-group="handleGroupRemove(index)"
      />
    </div>

    <!-- Add Group Button -->
    <div v-if="!readonly" class="add-group-container">
      <button class="btn-add-group" @click="addNewGroup">
        <span class="btn-add-group__icon">+</span>
        <span class="btn-add-group__text">Add Criteria Group</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-criteria {
  .criteria-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e0e0e0;
  }

  .criteria-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .qualifying-events-controls {
    display: flex;
    gap: 8px;
  }

  .qualifying-events-btn {
    padding: 8px 16px;
    border: 1px solid #d0d0d0;
    background: #fff;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      border-color: #1976d2;
      color: #1976d2;
    }

    &--active {
      background: #1976d2;
      border-color: #1976d2;
      color: white;
    }

    &--readonly {
      cursor: not-allowed;
      opacity: 0.6;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .criteria-groups {
    margin-bottom: 24px;
  }

  .add-group-container {
    display: flex;
    justify-content: center;
    padding: 16px 0;
  }

  .btn-add-group {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border: 2px dashed #d0d0d0;
    background: transparent;
    border-radius: 8px;
    color: #666;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1976d2;
      color: #1976d2;
      background: rgba(25, 118, 210, 0.04);
    }

    &__icon {
      font-size: 18px;
      font-weight: 600;
    }

    &__text {
      font-weight: 500;
    }
  }
}
</style>
