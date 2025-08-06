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
import type { ConceptSetItemDisplay, ConceptSetDomainValues } from '../types/ConceptSetTypes'
import ButtonMaterial from './ButtonMaterial.vue'
import AddIcon from './icons/AddIcon.vue'
import GroupButtons from './GroupButtons.vue'

interface Props {
  criteriaData?: any
  conceptSets?: ConceptSetItemDisplay[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  datasetId?: string | null
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
  'concept-set-action': [action: any]
}>()

// Get current criteria data (now from props instead of criteriaManager)
const currentCriteriaData = computed(() => props.criteriaData)

// Handle qualifying events limit selection
const updateQualifyingLimit = (value: string) => {
  // Type guard to ensure the value is valid
  if (value === 'ALL' || value === 'EARLIEST' || value === 'LATEST') {
    emit('update-qualifying-limit', value)
  }
}

const qualifyingEventsOptions = [
  { value: 'EARLIEST', label: 'Earliest' },
  { value: 'ALL', label: 'All' },
  { value: 'LATEST', label: 'Latest' },
]

const currentQualifyingLimit = computed(() => {
  return currentCriteriaData.value.criteriaType || 'ALL'
})

// Event name changed from 'click' to 'button-click' to avoid native event conflicts

// Handle adding new criteria group
const addNewGroup = () => {
  // Create new criteria group
  const staticCount = currentCriteriaData.value.criteria.length + 1
  const newGroup = {
    id: `criteria_${Date.now()}`,
    title: `Criteria ${staticCount}`,
    description: `Description for Criteria ${staticCount}`,
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
      <div class="criteria-title-container">
        <h3 class="criteria-title">Inclusion Criteria</h3>
      </div>

      <div class="qualifying-events-controls">
        <GroupButtons
          :options="qualifyingEventsOptions"
          :limitValue="currentQualifyingLimit"
          :namePrefix="'criteria'"
          @update-limit-value="updateQualifyingLimit"
        />
      </div>

      <div class="shadow-container"></div>
    </div>

    <!-- Criteria Groups with Sidebar -->
    <div class="criteria-groups-layout">
      <!-- Criteria Groups Sidebar -->
      <div class="criteria-groups-sidebar">
        <span class="criteria-sidebar-label">ALL</span>
      </div>

      <!-- Criteria Groups Only -->
      <div class="criteria-groups-content">
        <!-- Add Group Button (Outside the sidebar layout) -->
        <div v-if="!readonly" class="add-group-container">
          <!-- <button class="btn-add-group" @click="addNewGroup">
            <span class="btn-add-group__icon">+</span>
            <span class="btn-add-group__text">Add Criteria Group</span>
          </button> -->

          <ButtonMaterial variant="text" color="primary" @button-click="addNewGroup">
            <template #startIcon>
              <AddIcon />
            </template>
            Add group
          </ButtonMaterial>
        </div>
        <QueryFilterCriteriaGroup
          v-for="(group, index) in currentCriteriaData.criteria"
          :key="group.id"
          :group="group"
          :group-index="index"
          :concept-sets="conceptSets"
          :concept-set-domain-values="
            conceptSetDomainValues || { values: [], isLoading: false, loadedStatus: 'NO_RESULTS' }
          "
          :concept-set-texts="conceptSetTexts || {}"
          :dataset-id="datasetId || null"
          :readonly="readonly"
          @update-group="handleGroupUpdate(index, $event)"
          @remove-group="handleGroupRemove(index)"
          @concept-set-action="action => $emit('concept-set-action', action)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-criteria {
  .criteria-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e0e0e0;
    position: relative;
    padding: 16px;

    .criteria-title-container,
    .shadow-container {
      flex: 1;
    }
    .qualifying-events-controls {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }

  .criteria-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fe5e59;
  }

  .criteria-groups-layout {
    display: flex;
  }

  .criteria-groups-sidebar {
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 6px;
    background: #000080; // Blue to match other sidebars
    position: relative;
    border-radius: 0 0 0 8px; // Round left corners

    // Add subtle border to indicate different states
    &::after {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: rgba(255, 255, 255, 0.3);
    }
  }

  .criteria-sidebar-label {
    writing-mode: sideways-lr;
    text-orientation: sideways;
    font-size: 13px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    user-select: none;
  }

  .criteria-groups-content {
    flex: 1;
    padding: 16px;
  }

  .add-group-container {
    display: flex;
    justify-content: center;
  }

  .btn-add-group {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
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
