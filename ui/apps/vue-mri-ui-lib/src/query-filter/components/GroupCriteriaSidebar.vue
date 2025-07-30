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
import type { QueryFilterGroup } from '../models/QueryFilterModel'

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
  
  if (criteriaType === 'AT_LEAST' && criteriaCount) {
    return `At least ${criteriaCount}`
  } else if (criteriaType === 'AT_MOST' && criteriaCount) {
    return `At most ${criteriaCount}`
  }
  return criteriaType
}

// Handle group criteria changes from menu
const handleGroupCriteriaUpdate = (groupCriteria: { type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'; count?: number }) => {
  emit('update-group-criteria', groupCriteria)
}

// Get sidebar CSS class based on criteria type
const getSidebarClass = computed(() => {
  const criteriaType = props.group.criteriaType?.toLowerCase() || 'all'
  return `group-sidebar--${criteriaType}`
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
      <span class="sidebar-label">{{ getGroupCriteriaDisplay() }}</span>
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
  justify-content: center;
  padding: 12px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  align-self: stretch; // Makes sidebar match the height of its flex container
  border-radius: 0 0 0 8px; // Round left corners

  // Default styling (ALL)
  background: #000080;

  // Different colors matching GroupCriteriaMenu
  &--all {
    background: #000080;
  }

  &--any {
    background: #E75248;
  }

  &--at_least {
    background: #2686EB;
  }

  &--at_most {
    background: #FA9087;
  }

  &:hover:not(.readonly) {
    opacity: 0.9;
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
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  user-select: none;
}
</style>