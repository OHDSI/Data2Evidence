<script lang="ts">
export default {
  name: 'QueryFilterCriteriaGroup',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import QueryFilterEventContainer from './QueryFilterEventContainer.vue'
import type { QueryFilterGroup } from '../models/QueryFilterModel'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'

interface Props {
  group: QueryFilterGroup
  groupIndex: number
  conceptSets?: ConceptSetItem[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  conceptSets: () => [],
  readonly: false,
})

const emit = defineEmits<{
  'update-group': [group: QueryFilterGroup]
  'remove-group': []
}>()

// Local reactive copy of the group
const localGroup = ref<QueryFilterGroup>({ ...props.group })

// Update local group when props change
const groupData = computed({
  get: () => localGroup.value,
  set: (value: QueryFilterGroup) => {
    localGroup.value = value
    emit('update-group', value)
  }
})

// Handle title changes
const updateTitle = (newTitle: string) => {
  groupData.value = {
    ...groupData.value,
    title: newTitle
  }
}

// Handle description changes
const updateDescription = (newDescription: string) => {
  groupData.value = {
    ...groupData.value,
    description: newDescription
  }
}

// Handle group type (operator) changes
const updateGroupType = (newType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST') => {
  groupData.value = {
    ...groupData.value,
    groupType: newType
  }
}

// Handle events updates from child container
const handleEventsUpdate = (updatedEvents: any[]) => {
  // For now, we're using the first group's events since the structure is transitional
  if (groupData.value.groups && groupData.value.groups[0]) {
    groupData.value.groups[0].events = updatedEvents
    emit('update-group', groupData.value)
  }
}

// Get events from first group (transitional structure)
const groupEvents = computed(() => {
  return groupData.value.groups?.[0]?.events || []
})

// Handle remove group
const removeGroup = () => {
  if (confirm('Are you sure you want to remove this criteria group?')) {
    emit('remove-group')
  }
}

// Get operator display text
const getOperatorText = (operator: string) => {
  switch (operator) {
    case 'ALL': return 'ALL of the following'
    case 'ANY': return 'ANY of the following'
    case 'AT_LEAST': return 'AT LEAST _ of the following'
    case 'AT_MOST': return 'AT MOST _ of the following'
    default: return operator
  }
}
</script>

<template>
  <div class="query-filter-criteria-group">
    <!-- Group Header -->
    <div class="group-header">
      <div class="group-header__left">
        <div class="group-title-container">
          <input 
            v-if="!readonly"
            v-model="localGroup.title"
            class="group-title-input"
            placeholder="Group Title"
            @input="updateTitle($event.target.value)"
          />
          <h4 v-else class="group-title-readonly">{{ localGroup.title }}</h4>
        </div>
        
        <div class="group-description-container">
          <textarea 
            v-if="!readonly"
            v-model="localGroup.description"
            class="group-description-input"
            placeholder="Group Description (optional)"
            rows="2"
            @input="updateDescription($event.target.value)"
          />
          <p v-else-if="localGroup.description" class="group-description-readonly">
            {{ localGroup.description }}
          </p>
        </div>
      </div>
      
      <div class="group-header__right">
        <div class="group-operator-container">
          <label class="operator-label">Match:</label>
          <select 
            v-if="!readonly"
            v-model="localGroup.groupType" 
            class="operator-select"
            @change="updateGroupType($event.target.value as any)"
          >
            <option value="ALL">ALL</option>
            <option value="ANY">ANY</option>
            <option value="AT_LEAST">AT LEAST</option>
            <option value="AT_MOST">AT MOST</option>
          </select>
          <span v-else class="operator-readonly">
            {{ getOperatorText(localGroup.groupType) }}
          </span>
        </div>
        
        <button 
          v-if="!readonly"
          class="btn-remove-group" 
          @click="removeGroup"
          title="Remove this criteria group"
        >
          ×
        </button>
      </div>
    </div>
    
    <!-- Group Sidebar and Content -->
    <div class="group-body">
      <div class="group-sidebar">
        <span class="sidebar-label">{{ localGroup.groupType }}</span>
      </div>
      
      <div class="group-content">
        <!-- Events Container -->
        <QueryFilterEventContainer
          :events="groupEvents"
          :parent-group="localGroup"
          :concept-sets="conceptSets"
          :concept-set-domain-values="conceptSetDomainValues"
          :concept-set-texts="conceptSetTexts"
          :readonly="readonly"
          @update-events="handleEventsUpdate"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-criteria-group {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
    border-radius: 8px 8px 0 0;

    &__left {
      flex: 1;
      margin-right: 16px;
    }

    &__right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  }

  .group-title-container {
    margin-bottom: 8px;
  }

  .group-title-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    background: #fff;

    &:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }

    &::placeholder {
      color: #999;
    }
  }

  .group-title-readonly {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .group-description-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 14px;
    color: #666;
    background: #fff;
    resize: vertical;
    min-height: 40px;

    &:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }

    &::placeholder {
      color: #999;
    }
  }

  .group-description-readonly {
    margin: 0;
    font-size: 14px;
    color: #666;
  }

  .group-operator-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .operator-label {
    font-size: 14px;
    font-weight: 500;
    color: #666;
  }

  .operator-select {
    padding: 6px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 14px;
    color: #333;
    background: #fff;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .operator-readonly {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }

  .btn-remove-group {
    width: 32px;
    height: 32px;
    border: 1px solid #d0d0d0;
    background: #fff;
    border-radius: 4px;
    color: #666;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      border-color: #dc3545;
      color: #dc3545;
      background: #fff5f5;
    }
  }

  .group-body {
    display: flex;
  }

  .group-sidebar {
    width: 60px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 16px 8px;
    background: #f8f9fa;
    border-right: 1px solid #e0e0e0;
  }

  .sidebar-label {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .group-content {
    flex: 1;
    padding: 16px;
  }
}
</style>