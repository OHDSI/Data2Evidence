<script lang="ts">
export default {
  name: 'QueryFilterCriteriaGroup',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import QueryFilterEventContainer from './QueryFilterEventContainer.vue'
import type { QueryFilterGroup } from '../models/QueryFilterModel'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'
import EditIcon from './icons/EditIcon.vue'
import CloseIcon from './icons/CloseIcon.vue'

interface Props {
  group: QueryFilterGroup
  groupIndex: number
  conceptSets?: ConceptSetItem[]
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
  'update-group': [group: QueryFilterGroup]
  'remove-group': []
  'concept-set-action': [action: any]
}>()

// Local reactive copy of the group
const localGroup = ref<QueryFilterGroup>({ ...props.group })

// Watch for changes in props.group and update local copy
watch(
  () => props.group,
  newGroup => {
    localGroup.value = { ...newGroup }
  },
  { deep: true }
)

// Update local group when props change
const groupData = computed({
  get: () => localGroup.value,
  set: (value: QueryFilterGroup) => {
    localGroup.value = value
    emit('update-group', value)
  },
})

// Title editing state
const isEditingTitle = ref(false)
const titleInputRef = ref<HTMLInputElement>()

// Handle title changes
const updateTitle = (newTitle: string) => {
  groupData.value = {
    ...groupData.value,
    title: newTitle,
  }
}

// Start editing title
const startEditingTitle = () => {
  if (!props.readonly) {
    isEditingTitle.value = true
    nextTick(() => {
      titleInputRef.value?.focus()
      titleInputRef.value?.select()
    })
  }
}

// Finish editing title
const finishEditingTitle = () => {
  isEditingTitle.value = false
}

// Handle enter key to finish editing
const handleTitleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    finishEditingTitle()
  } else if (event.key === 'Escape') {
    // Restore original title on escape
    localGroup.value.title = props.group.title
    finishEditingTitle()
  }
}

// Handle group type (operator) changes
const updateGroupType = (newType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST') => {
  groupData.value = {
    ...groupData.value,
    criteriaType: newType,
  }
}

// Handle events updates from child container
const handleEventsUpdate = (updatedEvents: any[]) => {
  groupData.value = {
    ...groupData.value,
    events: updatedEvents,
  }
  emit('update-group', groupData.value)
}

// Get events from group
const groupEvents = computed(() => {
  return groupData.value.events || []
})

// Handle remove group
const removeGroup = () => {
  if (confirm('Are you sure you want to remove this criteria group?')) {
    emit('remove-group')
  }
}

// Toggle between group types by cycling through them
const toggleGroupType = () => {
  const types: ('ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST')[] = ['ALL', 'ANY', 'AT_LEAST', 'AT_MOST']
  const currentType = localGroup.value.criteriaType || 'ALL'
  const currentIndex = types.indexOf(currentType)
  const nextIndex = (currentIndex + 1) % types.length
  const nextType = types[nextIndex] || 'ALL'
  updateGroupType(nextType)
}

// Removed duplicate criteria selection handler
</script>

<template>
  <div class="query-filter-criteria-group">
    <!-- Group with Full-Height Sidebar -->
    <div class="group-layout">
      <!-- Group Header -->
      <div v-if="!hideHeader" class="group-header">
        <div class="group-header__left">
          <div class="group-title-container">
            <!-- Editable Title with Pencil Button -->
            <div class="title-edit-wrapper">
              <input
                v-if="isEditingTitle && !readonly"
                ref="titleInputRef"
                v-model="localGroup.title"
                class="group-title-input"
                placeholder="Group Title"
                @blur="finishEditingTitle"
                @keydown="handleTitleKeydown"
                @input="updateTitle(($event.target as HTMLInputElement).value)"
              />
              <h4 v-else class="group-title-display" @click="readonly ? null : startEditingTitle()">
                {{ localGroup.title || 'Untitled Group' }}
              </h4>
              <button
                v-if="!readonly && !isEditingTitle"
                class="btn-edit-title"
                @click="startEditingTitle"
                title="Edit group title"
              >
                <EditIcon />
              </button>
            </div>
          </div>
        </div>

        <div class="group-header__right">
          <button v-if="!readonly" class="btn-remove-group" @click="removeGroup" title="Remove this criteria group">
            <CloseIcon />
          </button>
        </div>
      </div>
      <!-- Group Content Area -->
      <div class="group-main">
        <!-- Full-Height Sidebar -->
        <div
          class="group-sidebar"
          :class="`group-sidebar--${localGroup.criteriaType?.toLowerCase() || 'all'}`"
          @click="!readonly && toggleGroupType()"
          :title="readonly ? '' : 'Click to change match type'"
        >
          <span class="sidebar-label">{{ localGroup.criteriaType || 'ALL' }}</span>
        </div>
        <!-- Group Content -->
        <div class="group-content">
          <!-- Events Container -->
          <QueryFilterEventContainer
            :events="groupEvents"
            event-type="CRITERIA"
            :parent-group="localGroup"
            :concept-sets="conceptSets"
            :concept-set-domain-values="
              conceptSetDomainValues || { values: [], isLoading: false, loadedStatus: 'NO_RESULTS' }
            "
            :concept-set-texts="conceptSetTexts || {}"
            :dataset-id="datasetId || null"
            :readonly="readonly"
            @update-events="handleEventsUpdate"
            @concept-set-action="action => $emit('concept-set-action', action)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-criteria-group {
  margin-top: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  &:not(:last-child) {
    margin-bottom: 8px;
  }
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .group-layout {
    display: flex;
    flex-direction: column;
  }

  .group-main {
    flex: 1;
    display: flex;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    background: transparent;
    border-radius: 0 8px 0 0; // Only round top-right corner

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
    margin-bottom: 4px;
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

  .title-edit-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px; // Ensure consistent height
  }

  .group-title-display {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
  }

  .btn-edit-title {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 4px;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    opacity: 0.7;

    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
      opacity: 1;
    }

    &:active {
      transform: scale(0.95);
    }
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

  // Removed old operator dropdown styles

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
      border-color: #000080;
      color: #000080;
      background: #f2f0f1;
    }
  }

  .group-sidebar {
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    align-self: stretch; // Makes sidebar match the height of its flex container
    border-radius: 0 0 0 8px; // Round left corners

    // Default styling (ALL)
    background: #000080;

    // Different colors for different group types
    &--all {
      background: #000080;
    }

    &--any {
      background: #dc2626; // Red like in the reference
    }

    &--at_least {
      background: #059669; // Green
    }

    &--at_most {
      background: #d97706; // Orange
    }

    &:hover:not(.readonly) {
      opacity: 0.9;
      transform: translateX(2px);
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    }

    &:active:not(.readonly) {
      transform: translateX(0);
      box-shadow: 1px 0 4px rgba(0, 0, 0, 0.1);
    }

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

  .sidebar-label {
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

  .group-content {
    flex: 1;
    padding: 12px;
    background: #f2f0f1;
  }
}
</style>
