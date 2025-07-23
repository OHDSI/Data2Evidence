<script lang="ts">
export default {
  name: 'AttributesDropdown',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import criteriaConfigLoader, { type AttributeOption } from '../utils/CriteriaConfigLoader'
import type { QueryFilterEvent } from '../models/QueryFilterModel'
import MenuIcon from './icons/MenuIcon.vue'

interface Props {
  criteriaType: string // The type of criteria (e.g., 'conditionOccurrence', 'drugExposure')
  disabled?: boolean
  eventId: string // The event ID for which this dropdown is shown
  allEvents: QueryFilterEvent[] // All events in the filter to check which attributes are already selected
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  allEvents: () => [],
})

const emit = defineEmits<{
  'attribute-selected': [attribute: AttributeOption]
  'attribute-removed': [attributeId: string]
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()
const menuAlignment = ref<'left' | 'right'>('left')
const isWideMenu = ref(false)
const flipVertical = ref(false)
const constrainHeight = ref(false)

// Get available attributes for this criteria type
const availableAttributes = computed<AttributeOption[]>(() => {
  try {
    // Get criteria-specific attributes (like nested, stop reason, etc.)
    return criteriaConfigLoader.getCriteriaAttributeOptions(props.criteriaType)
  } catch (error) {
    console.warn(`Failed to load attributes for criteria ${props.criteriaType}:`, error)
    return []
  }
})

// Check if an attribute is currently selected by looking at the current event's attributes
const isAttributeSelected = (attributeId: string) => {
  // Find the current event by eventId
  const currentEvent = props.allEvents.find((event: QueryFilterEvent) => event.id === props.eventId)
  if (!currentEvent) return false

  // Check if the attribute is in the attributes array
  return currentEvent.attributes?.some(attr => attr.id === attributeId) || false
}

// Get currently selected attributes for the button label
const selectedAttributeIds = computed(() => {
  // Find the current event by eventId
  const currentEvent = props.allEvents.find((event: QueryFilterEvent) => event.id === props.eventId)
  if (!currentEvent || !currentEvent.attributes) return []

  // Return the IDs of selected attributes
  return currentEvent.attributes.map(attr => attr.id)
})

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      // Calculate positioning after the next render cycle
      setTimeout(calculateDropdownPosition, 0)
    }
  }
}

// Calculate smart positioning to prevent dropdown from going off-screen
const calculateDropdownPosition = () => {
  if (!dropdownRef.value) return

  const trigger = dropdownRef.value.querySelector('.attributes-dropdown__trigger') as HTMLElement
  const menu = dropdownRef.value.querySelector('.attributes-dropdown__menu') as HTMLElement

  if (!trigger || !menu) return

  const triggerRect = trigger.getBoundingClientRect()
  const menuWidth = 300 // min-width from CSS
  const menuHeight = 500 // max-height from CSS
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const scrollbarWidth = 20 // approximate scrollbar width
  const margin = 10 // minimum margin from viewport edges

  // Reset positioning flags
  flipVertical.value = false
  constrainHeight.value = false

  // Check if trigger button is very small (indicates we should center the menu)
  isWideMenu.value = triggerRect.width < 50

  // Calculate horizontal positioning
  const spaceOnRight = viewportWidth - triggerRect.left - scrollbarWidth
  const spaceOnLeft = triggerRect.right

  if (isWideMenu.value) {
    // For small buttons, center the menu but check bounds
    const centerPosition = triggerRect.left + triggerRect.width / 2
    const menuHalfWidth = menuWidth / 2

    if (centerPosition - menuHalfWidth < margin) {
      // Too close to left edge, align to right of center
      menuAlignment.value = 'right'
    } else if (centerPosition + menuHalfWidth > viewportWidth - scrollbarWidth - margin) {
      // Too close to right edge, align to left of center
      menuAlignment.value = 'left'
    } else {
      // Safe to center
      menuAlignment.value = 'left'
    }
  } else {
    // For normal buttons, choose left or right alignment
    if (spaceOnRight < menuWidth && spaceOnLeft >= menuWidth) {
      menuAlignment.value = 'right'
    } else {
      menuAlignment.value = 'left'
    }
  }

  // Calculate vertical positioning
  const spaceBelow = viewportHeight - triggerRect.bottom - margin
  const spaceAbove = triggerRect.top - margin

  if (spaceBelow < menuHeight && spaceAbove > spaceBelow && spaceAbove >= 200) {
    // Not enough space below, but more space above - flip to top
    flipVertical.value = true

    // If still not enough space above, constrain height
    if (spaceAbove < menuHeight) {
      constrainHeight.value = true
    }
  } else if (spaceBelow < menuHeight) {
    // Not enough space below and not enough above either - constrain height
    constrainHeight.value = true
  }
}

const selectAttribute = (attribute: AttributeOption) => {
  if (isAttributeSelected(attribute.id)) {
    emit('attribute-removed', attribute.id)
  } else {
    emit('attribute-selected', attribute)
  }
  // Keep dropdown open for multiple selections
}

const closeDropdown = () => {
  isOpen.value = false
}

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

// Handle window resize to recalculate positioning
const handleResize = () => {
  if (isOpen.value) {
    calculateDropdownPosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
})

const hasAttributes = computed(() => availableAttributes.value.length > 0)
</script>

<template>
  <div class="attributes-dropdown" ref="dropdownRef">
    <button
      class="attributes-dropdown__trigger"
      :class="{
        'is-open': isOpen,
        'is-disabled': disabled || !hasAttributes,
        'has-selections': selectedAttributeIds.length > 0,
      }"
      @click="toggleDropdown"
      :disabled="disabled || !hasAttributes"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      :title="hasAttributes ? 'Configure attributes' : 'No attributes available'"
    >
      <MenuIcon />
    </button>

    <div
      v-if="isOpen"
      class="attributes-dropdown__menu"
      :class="{
        'align-right': menuAlignment === 'right',
        'wide-menu': isWideMenu,
        'flip-vertical': flipVertical,
        'constrained-height': constrainHeight,
      }"
      role="menu"
    >
      <div class="attributes-dropdown__header">
        <span class="attributes-dropdown__title">Attributes</span>
        <span class="attributes-dropdown__subtitle"> Configure additional criteria properties </span>
      </div>

      <div class="attributes-dropdown__content">
        <div class="attributes-dropdown__category">
          <div class="attributes-dropdown__attributes">
            <label
              v-for="attribute in availableAttributes"
              :key="attribute.id"
              class="attributes-dropdown__attribute"
              :class="{ 'is-selected': isAttributeSelected(attribute.id) }"
            >
              <input
                type="checkbox"
                :checked="isAttributeSelected(attribute.id)"
                @change="selectAttribute(attribute)"
                class="attributes-dropdown__checkbox"
              />
              <div class="attributes-dropdown__attribute-content">
                <span class="attributes-dropdown__attribute-name">{{ attribute.title }}</span>
                <span
                  v-if="attribute.description || attribute.defaultDescription"
                  class="attributes-dropdown__attribute-description"
                >
                  {{ attribute.description || attribute.defaultDescription }}
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div v-if="!hasAttributes" class="attributes-dropdown__empty">
        <p>No attributes available for criteria type "{{ criteriaType }}"</p>
      </div>

      <div v-if="hasAttributes" class="attributes-dropdown__footer">
        <button class="attributes-dropdown__close-btn" @click="closeDropdown">Done</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../styles/AttributesDropdown';
</style>
