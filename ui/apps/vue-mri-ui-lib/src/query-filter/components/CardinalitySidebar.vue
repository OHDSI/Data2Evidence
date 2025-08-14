<script lang="ts">
export default {
  name: 'CardinalitySidebar',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CardinalityMenu from './CardinalityMenu.vue'
import type { QueryFilterCardinality } from '../types/QueryFilterTypes'

interface Props {
  cardinality?: QueryFilterCardinality
  eventId: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

const emit = defineEmits<{
  'update-cardinality': [cardinality: QueryFilterCardinality]
}>()

// Ref for sidebar element (needed for CardinalityMenu)
const sidebarRef = ref<HTMLElement | null>(null)

// Get cardinality display text
const getCardinalityDisplay = () => {
  const cardinality = props.cardinality
  if (!cardinality) return 'At least 1'

  const typeText =
    {
      AT_LEAST: 'At least',
      EXACTLY: 'Exactly',
      AT_MOST: 'At most',
    }[cardinality.type] || cardinality.type

  return `${typeText} ${cardinality.count}`
}

// Handle cardinality changes from menu
const handleCardinalityUpdate = (cardinality: QueryFilterCardinality) => {
  emit('update-cardinality', cardinality)
}

// Get sidebar CSS class based on cardinality type
const getSidebarClass = computed(() => {
  const cardinality = props.cardinality
  if (!cardinality) return 'event-sidebar--at-least' // Default

  const cardinalityType = cardinality.type.toLowerCase()
  return `event-sidebar--${cardinalityType}`
})
</script>

<template>
  <div class="cardinality-sidebar">
    <!-- Sidebar -->
    <div
      ref="sidebarRef"
      class="event-sidebar"
      :class="getSidebarClass"
      :style="{ cursor: readonly ? 'default' : 'pointer' }"
      :title="readonly ? '' : 'Click to change cardinality'"
    >
      <span class="sidebar-label">
        {{ getCardinalityDisplay() }}
      </span>
    </div>

    <!-- Cardinality Menu -->
    <CardinalityMenu
      v-if="sidebarRef && !readonly"
      type="EVENT"
      :target="sidebarRef"
      :name-prefix="eventId"
      :cardinality="cardinality"
      @updateCardinalityField="handleCardinalityUpdate"
    />
  </div>
</template>

<style lang="scss" scoped>
.cardinality-sidebar {
  display: contents; // Pass-through container
}

.event-sidebar {
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 6px;
  transition: all 0.2s ease;
  position: relative;
  align-self: stretch; // Makes sidebar match the height of its flex container
  border-radius: 6px 0 0 6px;

  // Default styling (AT_LEAST)
  background: #2686eb;

  // Different colors matching CardinalityMenu
  &--exactly {
    background: #000000; // Black
  }

  &--at_least {
    background: #2686eb; // Blue
  }

  &--at_most {
    background: #fa9087; // Light red
  }

  &:hover:not([style*='cursor: default']) {
    opacity: 0.9;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }

  &:active:not([style*='cursor: default']) {
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
  font-size: 14px;
  font-weight: 500;
  color: white; // White text for all cardinality types
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  user-select: none;
}
</style>
