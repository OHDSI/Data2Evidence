<script lang="ts">
export default {
  name: 'GroupCriteriaSidebar',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import GroupCriteriaMenu from './GroupCriteriaMenu.vue'
import type { QueryFilterGroup } from '../types/QueryFilterTypes'

interface Props {
  group: QueryFilterGroup
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

const emit = defineEmits<{
  'update-group-criteria': [groupCriteria: { type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'; count?: number }]
}>()

// Ref for sidebar element (needed for GroupCriteriaMenu)
const sidebarRef = ref<HTMLElement | null>(null)

// Get current group criteria for menu
const getCurrentGroupCriteria = () => {
  return {
    type: props.group.criteriaType || 'ALL',
    count: props.group.criteriaCount,
  }
}

// Get display text for group criteria
const getGroupCriteriaDisplay = () => {
  const criteriaType = props.group.criteriaType || 'ALL'
  const criteriaCount = props.group.criteriaCount

  if (criteriaType === 'AT_LEAST' && criteriaCount !== undefined) {
    return `At least ${criteriaCount}`
  } else if (criteriaType === 'AT_MOST' && criteriaCount !== undefined) {
    return `At most ${criteriaCount}`
  }

  // Convert enum to friendly text
  switch (criteriaType) {
    case 'ALL':
      return 'All'
    case 'ANY':
      return 'Any'
    case 'AT_LEAST':
      return 'At least' // Fallback without count
    case 'AT_MOST':
      return 'At most' // Fallback without count
    default:
      return criteriaType
  }
}

// Handle group criteria changes from menu
const handleGroupCriteriaUpdate = (groupCriteria: { type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'; count?: number }) => {
  emit('update-group-criteria', groupCriteria)
}

// Get sidebar CSS class based on criteria type
const getSidebarClass = computed(() => {
  const criteriaType = props.group.criteriaType?.toLowerCase() || 'all'
  return `group-sidebar-variant--${criteriaType}`
})
</script>

<template>
  <div class="group-criteria-sidebar">
    <!-- Sidebar -->
    <div
      ref="sidebarRef"
      class="group-sidebar"
      :class="getSidebarClass"
      :title="readonly ? '' : 'Click to change match type'"
    >
      <div class="group-sidebar-top" :class="getSidebarClass"></div>
      <div class="group-sidebar-label">
        <span class="sidebar-label" :class="getSidebarClass">{{ getGroupCriteriaDisplay() }}</span>
      </div>
    </div>

    <!-- Group Criteria Menu -->
    <GroupCriteriaMenu
      v-if="sidebarRef && !readonly"
      :target="sidebarRef"
      :name-prefix="group.id || 'group'"
      :group-criteria="getCurrentGroupCriteria()"
      @updateGroupCriteriaField="handleGroupCriteriaUpdate"
    />
  </div>
</template>

<style lang="scss" scoped>
.group-criteria-sidebar {
  display: contents; // Pass-through container
}

.group-sidebar {
  width: 30px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: stretch;
  border-radius: 0 0 0 8px;

  &.group-sidebar-variant--all {
    border: 1px solid var(--color-cardinality-all);
  }
  &.group-sidebar-variant--any {
    border: 1px solid var(--color-cardinality-any);
  }
  &.group-sidebar-variant--at_least {
    border: 1px solid var(--color-cardinality-at-least);
  }
  &.group-sidebar-variant--at_most {
    border: 1px solid var(--color-cardinality-at-most);
  }
  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(255, 255, 255, 0.3);
  }
  .group-sidebar-top {
    width: 30%;
    height: 100%;
    border-radius: 0 0 0 6px;
    &.group-sidebar-variant--all {
      background: var(--color-cardinality-all);
    }
    &.group-sidebar-variant--any {
      background: var(--color-cardinality-any);
    }
    &.group-sidebar-variant--at_least {
      background: var(--color-cardinality-at-least);
    }
    &.group-sidebar-variant--at_most {
      background: var(--color-cardinality-at-most);
    }
    &:hover:not(.readonly) {
      opacity: 0.9;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    }
    &:active:not(.readonly) {
      transform: translateX(0);
      box-shadow: 1px 0 4px rgba(0, 0, 0, 0.1);
    }
  }
}

.sidebar-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-size: 14px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  user-select: none;
  &.group-sidebar-variant--all {
    color: var(--color-cardinality-all);
  }
  &.group-sidebar-variant--any {
    color: var(--color-cardinality-any);
  }
  &.group-sidebar-variant--at_least {
    color: var(--color-cardinality-at-least);
  }
  &.group-sidebar-variant--at_most {
    color: var(--color-cardinality-at-most);
  }
}
</style>
