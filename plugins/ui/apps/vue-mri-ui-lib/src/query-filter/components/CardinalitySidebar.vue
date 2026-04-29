<script lang="ts">
export default {
  name: 'CardinalitySidebar',
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
  if (!cardinality) return 'event-sidebar-variant--at-least' // Default

  const cardinalityType = cardinality.type.toLowerCase()
  return `event-sidebar-variant--${cardinalityType}`
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
      <div class="event-sidebar-top" :class="getSidebarClass"></div>
      <div>
        <span class="sidebar-label" :class="getSidebarClass">
          {{ getCardinalityDisplay() }}
        </span>
      </div>
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
  transition: all 0.2s ease;
  align-self: stretch; // Makes sidebar match the height of its flex container
  border-radius: 5px 0 0 5px;

  &.event-sidebar-variant--exactly {
    border: 1px solid var(--color-cardinality-exactly);
  }
  &.event-sidebar-variant--at_least {
    border: 1px solid var(--color-cardinality-at-least);
  }
  &.event-sidebar-variant--at_most {
    border: 1px solid var(--color-cardinality-at-most);
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

  .event-sidebar-top {
    width: 30%;
    height: 100%;
    border-radius: 4px 0 0 4px;

    &.event-sidebar-variant--exactly {
      background: var(--color-cardinality-exactly);
    }
    &.event-sidebar-variant--at_least {
      background: var(--color-cardinality-at-least);
    }
    &.event-sidebar-variant--at_most {
      background: var(--color-cardinality-at-most);
    }
  }
}

.sidebar-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-size: 14px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  user-select: none;

  &.event-sidebar-variant--exactly {
    color: var(--color-cardinality-exactly);
  }
  &.event-sidebar-variant--at_least {
    color: var(--color-cardinality-at-least);
  }
  &.event-sidebar-variant--at_most {
    color: var(--color-cardinality-at-most);
  }
}
</style>
