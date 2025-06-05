<script lang="ts">
export default {
  name: 'CriteriaSelectorDropdown',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import criteriaConfigLoader, { type CriteriaOption } from './CriteriaConfigLoader'

interface Props {
  sectionId: string // 'initialEvents', 'censoringEvents', 'criteriaGroup'
  buttonText?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  buttonText: 'Add event',
  disabled: false
})

const emit = defineEmits<{
  'criteria-selected': [option: CriteriaOption]
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()

// Get criteria options based on section
const criteriaOptions = computed(() => {
  const descriptionType = props.sectionId === 'initialEvents' ? 'initial' : 
                         props.sectionId === 'censoringEvents' ? 'censoring' : 
                         'group'
  
  try {
    return criteriaConfigLoader.getCriteriaOptions(props.sectionId, descriptionType)
  } catch (error) {
    console.warn(`Failed to load criteria for section ${props.sectionId}:`, error)
    return []
  }
})

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const selectCriteria = (option: CriteriaOption) => {
  emit('criteria-selected', option)
  isOpen.value = false
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
</script>

<template>
  <div class="criteria-selector-dropdown" ref="dropdownRef">
    <button 
      class="criteria-selector-dropdown__trigger"
      :class="{ 
        'is-open': isOpen,
        'is-disabled': disabled
      }"
      @click="toggleDropdown"
      :disabled="disabled"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
    >
      <span class="criteria-selector-dropdown__text">{{ buttonText }}</span>
      <i class="criteria-selector-dropdown__icon" :class="isOpen ? 'icon-chevron-up' : 'icon-chevron-down'"></i>
    </button>

    <div 
      v-if="isOpen" 
      class="criteria-selector-dropdown__menu"
      role="menu"
    >
      <div class="criteria-selector-dropdown__header">
        <span class="criteria-selector-dropdown__title">Select Criteria Type</span>
      </div>
      
      <div class="criteria-selector-dropdown__options">
        <button
          v-for="option in criteriaOptions"
          :key="option.id"
          class="criteria-selector-dropdown__option"
          @click="selectCriteria(option)"
          role="menuitem"
          :title="option.description"
        >
          <div class="criteria-selector-dropdown__option-content">
            <i class="criteria-selector-dropdown__option-icon" :class="option.icon"></i>
            <div class="criteria-selector-dropdown__option-text">
              <span class="criteria-selector-dropdown__option-title">{{ option.title }}</span>
              <span class="criteria-selector-dropdown__option-description">{{ option.description }}</span>
            </div>
          </div>
        </button>
      </div>
      
      <div v-if="criteriaOptions.length === 0" class="criteria-selector-dropdown__empty">
        <p>No criteria types available</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.criteria-selector-dropdown {
  position: relative;
  display: inline-block;

  &__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 120px;

    &:hover:not(.is-disabled) {
      background: #2563eb;
    }

    &.is-open {
      background: #2563eb;
    }

    &.is-disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  }

  &__text {
    flex: 1;
    text-align: left;
  }

  &__icon {
    font-size: 12px;
    transition: transform 0.2s;
  }

  &__menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    z-index: 1000;
    min-width: 320px;
    max-height: 400px;
    overflow-y: auto;
  }

  &__header {
    padding: 12px 16px 8px;
    border-bottom: 1px solid #f3f4f6;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  &__options {
    padding: 8px 0;
  }

  &__option {
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background: #f9fafb;
    }

    &:focus {
      outline: none;
      background: #f3f4f6;
    }
  }

  &__option-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    text-align: left;
  }

  &__option-icon {
    font-size: 16px;
    color: #6b7280;
    margin-top: 2px;
    min-width: 16px;
  }

  &__option-text {
    flex: 1;
    min-width: 0;
  }

  &__option-title {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 2px;
  }

  &__option-description {
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
}

// Icon definitions (using FontAwesome classes as fallback)
.icon {
  font-family: 'Font Awesome 5 Free', 'app-icons';
  font-style: normal;
  font-weight: 900;

  &-chevron-down::before {
    content: '\f078';
  }

  &-chevron-up::before {
    content: '\f077';
  }

  // Common medical icons
  &-heartbeat::before {
    content: '\f21e';
  }

  &-stethoscope::before {
    content: '\f0f1';
  }

  &-pills::before {
    content: '\f484';
  }

  &-capsules::before {
    content: '\f46b';
  }

  &-thermometer::before {
    content: '\f491';
  }

  &-eye::before {
    content: '\f06e';
  }

  &-calendar::before {
    content: '\f133';
  }

  &-procedures::before,
  &-clipboard::before {
    content: '\f328';
  }

  &-hospital::before {
    content: '\f0f8';
  }

  &-user::before {
    content: '\f007';
  }

  &-times-circle::before {
    content: '\f057';
  }

  &-medkit::before {
    content: '\f0fa';
  }

  &-prescription::before {
    content: '\f5b1';
  }

  &-vial::before {
    content: '\f492';
  }

  &-id-card::before {
    content: '\f2c2';
  }

  &-map-marker::before {
    content: '\f041';
  }

  &-object-group::before {
    content: '\f247';
  }

  &-recycle::before {
    content: '\f1b8';
  }
}
</style>