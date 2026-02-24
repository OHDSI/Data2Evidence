<template>
  <div ref="wrapperRef" class="concept-set-typeahead">
    <div class="typeahead-input-wrapper">
      <input
        :id="fieldId"
        ref="inputRef"
        v-model="searchText"
        class="form-control"
        type="text"
        :placeholder="placeholder"
        :disabled="loading"
        autocomplete="off"
        @keydown="handleKeyDown"
        @focus="handleFocus"
        @input="handleInput"
      />
      <span v-if="loading" class="loading-indicator">
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      </span>
    </div>

    <div v-if="isOpen" class="suggestions-dropdown">
      <ul ref="suggestionsListRef" class="suggestions-list">
        <li v-if="loading" class="suggestion-message">Loading...</li>
        <li v-else-if="filteredOptions.length === 0" class="suggestion-message">No results</li>
        <li
          v-for="(item, index) in filteredOptions"
          :key="item.value"
          :class="['suggestion-item', { highlighted: index === highlightedIndex }]"
          @mousedown.prevent="selectItem(item)"
          @mouseenter="highlightedIndex = index"
        >
          <span class="suggestion-text">{{ item.label }}</span>
          <span v-if="item.label !== item.value" class="suggestion-value">({{ item.value }})</span>
        </li>
      </ul>
    </div>

    <div v-if="allowFreeText" class="free-text-toggle">
      <label class="checkbox-label">
        <input type="checkbox" v-model="isFreeText" @change="handleFreeTextToggle" />
        <span>Enter custom value</span>
      </label>
    </div>

    <div v-if="selectedItem && !isFreeText" class="selected-item">
      <span class="selected-label">Selected:</span>
      <span class="selected-value">{{ selectedItem.label }}</span>
      <button class="clear-button" @click="clearSelection" title="Clear selection">×</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'

interface Option {
  value: string
  label: string
}

interface DomainValueItem {
  value: string
  text: string
  display_value?: string
}

const props = defineProps<{
  fieldId: string
  label: string
  configPath: string
  required?: boolean
  allowFreeText?: boolean
  modelValue: string | null
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
  (e: 'update:displayValue', value: string | null): void
}>()

const store = useStore()

const searchText = ref('')
const highlightedIndex = ref(-1)
const isOpen = ref(false)
const isFreeText = ref(false)
const loading = ref(false)
const options = ref<Option[]>([])
const suggestionsListRef = ref<HTMLUListElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)
const debounceTimer = ref<number | null>(null)
const selectedItem = ref<Option | null>(null)
const lastQuery = ref<string | null>(null)

const placeholder = computed(() => props.placeholder || `Search ${props.label}...`)

// Filter and sort options: exact matches first, then starts-with, then contains
const filteredOptions = computed(() => {
  if (!searchText.value) return options.value

  const query = searchText.value.toLowerCase()
  const exact: Option[] = []
  const startsWith: Option[] = []
  const contains: Option[] = []

  for (const item of options.value) {
    const label = item.label.toLowerCase()
    if (label === query) exact.push(item)
    else if (label.startsWith(query)) startsWith.push(item)
    else if (label.includes(query)) contains.push(item)
  }

  return [...exact, ...startsWith, ...contains]
})

function domainValueToOption(item: DomainValueItem): Option {
  const label = item.display_value || item.text
  return {
    value: item.value,
    label: label !== item.value ? `${label} (${item.value})` : label,
  }
}

async function fetchOptions(query: string) {
  if (query === lastQuery.value) return
  lastQuery.value = query

  loading.value = true
  try {
    const data = await store.dispatch('loadValuesForAttributePath', {
      attributePathUid: props.configPath,
      searchQuery: query,
      attributeType: 'text',
    })
    options.value = (data || []).map(domainValueToOption)
  } catch {
    options.value = []
  } finally {
    loading.value = false
  }
}

function debouncedFetch(query: string) {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  debounceTimer.value = window.setTimeout(() => fetchOptions(query), 300)
}

function handleFocus() {
  isOpen.value = true
  fetchOptions(searchText.value)
}

function handleInput() {
  selectedItem.value = null
  if (!isFreeText.value) {
    emit('update:modelValue', null)
    emit('update:displayValue', null)
  }
  isOpen.value = true
  highlightedIndex.value = -1
  debouncedFetch(searchText.value)
}

function handleKeyDown(event: KeyboardEvent) {
  if (!isOpen.value) {
    if (event.key === 'ArrowDown' && options.value.length > 0) {
      isOpen.value = true
      highlightedIndex.value = 0
      event.preventDefault()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredOptions.value.length) {
        selectItem(filteredOptions.value[highlightedIndex.value])
      } else if (props.allowFreeText && searchText.value.trim()) {
        selectFreeText(searchText.value.trim())
      }
      break
    case 'Escape':
      isOpen.value = false
      highlightedIndex.value = -1
      break
  }
}

function scrollToHighlighted() {
  nextTick(() => {
    const list = suggestionsListRef.value
    if (!list) return

    const highlightedItem = list.children[highlightedIndex.value] as HTMLElement
    if (highlightedItem) {
      highlightedItem.scrollIntoView({ block: 'nearest' })
    }
  })
}

function selectItem(item: Option) {
  selectedItem.value = item
  searchText.value = item.label
  isOpen.value = false
  highlightedIndex.value = -1
  emit('update:modelValue', item.value)
  emit('update:displayValue', item.label)
}

function selectFreeText(value: string) {
  isOpen.value = false
  emit('update:modelValue', value)
  emit('update:displayValue', value)
}

function clearSelection() {
  selectedItem.value = null
  searchText.value = ''
  emit('update:modelValue', null)
  emit('update:displayValue', null)
}

function handleFreeTextToggle() {
  if (isFreeText.value) {
    isOpen.value = false
    if (selectedItem.value) {
      searchText.value = selectedItem.value.value
      emit('update:modelValue', selectedItem.value.value)
      emit('update:displayValue', selectedItem.value.value)
    }
  } else {
    searchText.value = ''
    selectedItem.value = null
    emit('update:modelValue', null)
    emit('update:displayValue', null)
  }
}

function handleClickOutside(event: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  fetchOptions('')
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
})

watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) {
      selectedItem.value = null
      if (!isFreeText.value) {
        searchText.value = ''
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.concept-set-typeahead {
  position: relative;
  width: 100%;
}

.typeahead-input-wrapper {
  position: relative;
}

.loading-indicator {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ced4da;
  border-top: none;
  border-radius: 0 0 4px 4px;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.suggestions-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.suggestion-message {
  padding: 8px 12px;
  color: #6c757d;
  font-size: 0.875rem;
  text-align: center;
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background-color: #f8f9fa;
}

.suggestion-text {
  flex: 1;
}

.suggestion-value {
  color: #6c757d;
  font-size: 0.875rem;
  margin-left: 8px;
}

.free-text-toggle {
  margin-top: 6px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #495057;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  margin: 0;
}

.selected-item {
  margin-top: 8px;
  padding: 6px 10px;
  background-color: #e9ecef;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.selected-label {
  color: #6c757d;
}

.selected-value {
  flex: 1;
  font-weight: 500;
}

.clear-button {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0 4px;
}

.clear-button:hover {
  color: #a71d2a;
}

.spinner-border {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  vertical-align: text-bottom;
  border: 0.2em solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-border 0.75s linear infinite;
}

@keyframes spinner-border {
  to {
    transform: rotate(360deg);
  }
}

.spinner-border-sm {
  width: 0.875rem;
  height: 0.875rem;
  border-width: 0.15em;
}
</style>
