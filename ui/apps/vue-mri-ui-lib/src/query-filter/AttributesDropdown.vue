<script lang="ts">
export default {
  name: 'AttributesDropdown',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import criteriaConfigLoader, { type AttributeConfig } from './CriteriaConfigLoader'

interface Props {
  criteriaType: string // The type of criteria (e.g., 'conditionOccurrence', 'drugExposure')
  disabled?: boolean
  selectedAttributes?: string[] // Currently selected attribute IDs
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  selectedAttributes: () => []
})

const emit = defineEmits<{
  'attribute-selected': [attribute: AttributeConfig & { category: string }]
  'attribute-removed': [attributeId: string]
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()

// Get available attributes for this criteria type
const availableAttributes = computed(() => {
  try {
    // Get criteria-specific attributes (like nested, stop reason, etc.)
    const criteriaAttributes = criteriaConfigLoader.getCriteriaAttributeOptions(props.criteriaType)
    return criteriaAttributes
  } catch (error) {
    console.warn(`Failed to load attributes for criteria ${props.criteriaType}:`, error)
    return []
  }
})

// Group attributes by type for better organization
const attributesByCategory = computed(() => {
  const grouped: Record<string, Array<any>> = {
    'Criteria-specific': []
  }
  
  availableAttributes.value.forEach(attr => {
    // All criteria-specific attributes go into one category for now
    grouped['Criteria-specific'].push(attr)
  })
  
  return grouped
})

// Check if an attribute is currently selected
const isAttributeSelected = (attributeId: string) => {
  return props.selectedAttributes.includes(attributeId)
}

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const selectAttribute = (attribute: any) => {
  if (isAttributeSelected(attribute.id)) {
    emit('attribute-removed', attribute.id)
  } else {
    // Add category property for compatibility
    const attributeWithCategory = { ...attribute, category: 'criteria-specific' }
    emit('attribute-selected', attributeWithCategory)
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Button label based on selection state
const buttonLabel = computed(() => {
  if (props.selectedAttributes.length === 0) {
    return '='
  }
  return `= (${props.selectedAttributes.length})`
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
        'has-selections': selectedAttributes.length > 0
      }"
      @click="toggleDropdown"
      :disabled="disabled || !hasAttributes"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      :title="hasAttributes ? 'Configure attributes' : 'No attributes available'"
    >
      {{ buttonLabel }}
    </button>

    <div 
      v-if="isOpen" 
      class="attributes-dropdown__menu"
      role="menu"
    >
      <div class="attributes-dropdown__header">
        <span class="attributes-dropdown__title">Attributes</span>
        <span class="attributes-dropdown__subtitle">
          Configure additional criteria properties
        </span>
      </div>
      
      <div class="attributes-dropdown__content">
        <div 
          v-for="(attributes, category) in attributesByCategory"
          :key="category"
          class="attributes-dropdown__category"
        >
          <h4 class="attributes-dropdown__category-title">
            {{ category.charAt(0).toUpperCase() + category.slice(1) }}
          </h4>
          
          <div class="attributes-dropdown__attributes">
            <label
              v-for="attribute in attributes"
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
                <span class="attributes-dropdown__attribute-name">{{ attribute.title || attribute.name }}</span>
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
        <p>No attributes available for this criteria type</p>
      </div>

      <div v-if="hasAttributes" class="attributes-dropdown__footer">
        <button 
          class="attributes-dropdown__close-btn"
          @click="closeDropdown"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.attributes-dropdown {
  position: relative;
  display: inline-block;

  &__trigger {
    background: none;
    border: none;
    padding: 6px 8px;
    cursor: pointer;
    color: #6b7280;
    border-radius: 4px;
    font-family: monospace;
    font-size: 14px;
    font-weight: bold;
    min-width: 24px;
    text-align: center;
    transition: all 0.2s;

    &:hover:not(.is-disabled) {
      background: #e5e7eb;
      color: #374151;
    }

    &.is-open {
      background: #e5e7eb;
      color: #374151;
    }

    &.is-disabled {
      color: #d1d5db;
      cursor: not-allowed;
    }

    &.has-selections {
      background: #ddd6fe;
      color: #5b21b6;

      &:hover:not(.is-disabled) {
        background: #c4b5fd;
      }
    }
  }

  &__menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    z-index: 1000;
    min-width: 300px;
    max-width: 400px;
    max-height: 500px;
    overflow-y: auto;
  }

  &__header {
    padding: 16px 16px 12px;
    border-bottom: 1px solid #f3f4f6;
  }

  &__title {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 4px;
  }

  &__subtitle {
    display: block;
    font-size: 12px;
    color: #6b7280;
  }

  &__content {
    padding: 8px 0;
  }

  &__category {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__category-title {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px 0;
    padding: 0 16px;
    text-transform: capitalize;
  }

  &__attributes {
    display: flex;
    flex-direction: column;
  }

  &__attribute {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background: #f9fafb;
    }

    &.is-selected {
      background: #f0f9ff;
    }
  }

  &__checkbox {
    margin: 0;
    cursor: pointer;
  }

  &__attribute-content {
    flex: 1;
    min-width: 0;
  }

  &__attribute-name {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 2px;
  }

  &__attribute-description {
    display: block;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.4;
  }

  &__empty {
    padding: 20px 16px;
    text-align: center;
    color: #6b7280;
    font-size: 14px;
  }

  &__footer {
    padding: 12px 16px;
    border-top: 1px solid #f3f4f6;
    background: #f9fafb;
  }

  &__close-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
    width: 100%;

    &:hover {
      background: #2563eb;
    }
  }
}
</style>