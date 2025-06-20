<script lang="ts">
export default {
  name: 'CriteriaSelectorDropdown',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import criteriaConfigLoader, { type CriteriaOption } from '../utils/CriteriaConfigLoader'
import { FilterType } from '../models/QueryFilterModel';

interface Props {
  sectionId: string // 'initialEvents', 'censoringEvents', 'criteriaGroup'
  filterType: FilterType
  buttonText?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  buttonText: 'Add event',
  disabled: false,
})

const emit = defineEmits<{
  'criteria-selected': [option: CriteriaOption, type: FilterType]
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()


// Get criteria options based on section
const criteriaOptions = computed(() => {
  const descriptionType =
    props.sectionId === 'initialEvents' ? 'initial' : props.sectionId === 'censoringEvents' ? 'censoring' : 'group'

  try {
    const options = criteriaConfigLoader.getCriteriaOptions(props.sectionId, descriptionType)
    return options
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
  console.log(props);
  
  emit('criteria-selected', option, props.filterType)
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
        'is-disabled': disabled,
      }"
      @click="toggleDropdown"
      :disabled="disabled"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
    >
      <span class="criteria-selector-dropdown__text">{{ buttonText }}</span>
      <i class="criteria-selector-dropdown__icon" :class="isOpen ? 'icon-chevron-up' : 'icon-chevron-down'"></i>
    </button>

    <div v-if="isOpen" class="criteria-selector-dropdown__menu" role="menu">
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
            <i class="criteria-selector-dropdown__option-icon" :class="option.icon || 'fa-plus-circle'"></i>
            <div class="criteria-selector-dropdown__option-text">
              <span class="criteria-selector-dropdown__option-title">{{ option.title }}</span>
              <span class="criteria-selector-dropdown__option-description">{{ option.description }}</span>
            </div>
          </div>
        </button>
      </div>

      <div v-if="criteriaOptions.length === 0" class="criteria-selector-dropdown__empty">
        <p>No criteria types available</p>
        <p class="debug-info">
          Section "{{ sectionId }}" not found. Available: initialEvents, censoringEvents, criteriaGroup
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../styles/CriteriaSelectorDropdown';
</style>

