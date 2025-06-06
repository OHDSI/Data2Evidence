<script lang="ts">
export default {
  name: 'AttributesDropdown',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import criteriaConfigLoader, { type AttributeConfig } from '../utils/CriteriaConfigLoader'

interface Props {
  criteriaType: string // The type of criteria (e.g., 'conditionOccurrence', 'drugExposure')
  disabled?: boolean
  conditionId: string // The condition ID for which this dropdown is shown
  allConditions: any[] // All conditions in the filter to check which attributes are already selected
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  allConditions: () => []
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

// Check if an attribute is currently selected by looking for existing attribute-based conditions
const isAttributeSelected = (attributeId: string) => {
  return props.allConditions.some(condition => 
    condition.isAttributeBased && 
    condition.parentConditionId === props.conditionId && 
    condition.attributeConfig?.id === attributeId
  )
}

// Get currently selected attributes for the button label
const selectedAttributeIds = computed(() => {
  return props.allConditions
    .filter(condition => 
      condition.isAttributeBased && 
      condition.parentConditionId === props.conditionId
    )
    .map(condition => condition.attributeConfig?.id)
    .filter(id => id)
})

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
  if (selectedAttributeIds.value.length === 0) {
    return '='
  }
  return `= (${selectedAttributeIds.value.length})`
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
        'has-selections': selectedAttributeIds.length > 0
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
@import '../styles/AttributesDropdown';
</style>