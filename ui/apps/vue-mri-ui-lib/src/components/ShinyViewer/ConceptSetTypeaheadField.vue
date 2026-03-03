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
        autocomplete="off"
        @keydown="handleKeyDown"
        @focus="handleFocus"
        @input="handleInput"
        @blur="handleBlur"
      />
      <span v-if="loading" class="loading-indicator">
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      </span>
      <button v-else-if="selectedItem" class="clear-btn" @click="clearSelection" :title="getText('MRI_PA_CLEAR_SELECTION')" type="button">
        ×
      </button>
    </div>

    <Teleport to="body">
      <div v-if="isOpen" class="concept-typeahead-dropdown" :style="dropdownStyle">
        <ul ref="suggestionsListRef" class="concept-typeahead-list">
          <li v-if="loading" class="concept-typeahead-message">{{ getText('MRI_PA_LOADING') }}</li>
          <li v-else-if="filteredOptions.length === 0" class="concept-typeahead-message">{{ getText('MRI_PA_NO_RESULTS') }}</li>
          <li
            v-for="(item, index) in filteredOptions"
            :key="item.value"
            :class="['concept-typeahead-item', { highlighted: index === highlightedIndex }]"
            @mousedown.prevent="selectItem(item)"
            @mouseenter="highlightedIndex = index"
          >
            <span class="concept-typeahead-text">{{ item.label }}</span>
            <span v-if="item.label !== item.value" class="concept-typeahead-value">({{ item.value }})</span>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'

function generateComponentUid(): string {
  return `component_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}


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
const getText = (key: string, param?: string | string[]) => store.getters.getText(key, param)

const componentUid = ref<string>(generateComponentUid())
const attributePathUid = computed(() => {
  return `${props.configPath}__${componentUid.value}`
})

const searchText = ref('')
const dropdownStyle = ref<Record<string, string>>({})
const highlightedIndex = ref(-1)
const isOpen = ref(false)
const isCustomValue = ref(false)
const loading = ref(false)
const options = ref<Option[]>([])
const suggestionsListRef = ref<HTMLUListElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const debounceTimer = ref<number | null>(null)
const selectedItem = ref<Option | null>(null)
const lastQuery = ref<string | null>(null)

const placeholder = computed(() => props.placeholder || getText('MRI_PA_SEARCH_PLACEHOLDER', props.label))

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
  // Return the display value as-is; the template will append the value in parentheses if needed
  const label = item.display_value || item.text || item.value
  return {
    value: item.value,
    label,
  }
}

async function fetchOptions(query: string) {
  if (query === lastQuery.value) return
  lastQuery.value = query

  loading.value = true
  try {
    const data = await store.dispatch('loadValuesForAttributePath', {
      attributePathUid: attributePathUid.value,
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
  updateDropdownPosition()
  fetchOptions(searchText.value)
}

function updateDropdownPosition() {
  nextTick(() => {
    const input = inputRef.value
    if (!input) return

    const rect = input.getBoundingClientRect()
    dropdownStyle.value = {
      position: 'fixed',
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      'z-index': '9999',
    }
  })
}

function handleInput() {
  selectedItem.value = null
  isCustomValue.value = false
  // Emit empty string instead of null to prevent parent watch from clearing searchText
  // Parent initializes with '', so keeping it as '' avoids triggering the watch
  emit('update:modelValue', '')
  emit('update:displayValue', '')
  isOpen.value = true
  highlightedIndex.value = -1
  updateDropdownPosition()
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
      } else if (searchText.value.trim()) {
        // Allow custom value on Enter when no suggestion is highlighted
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
  isCustomValue.value = false
  searchText.value = item.label
  isOpen.value = false
  highlightedIndex.value = -1
  emit('update:modelValue', item.value)
  emit('update:displayValue', item.label)
}

function selectFreeText(value: string) {
  isCustomValue.value = true
  selectedItem.value = { value, label: value }
  isOpen.value = false
  highlightedIndex.value = -1
  emit('update:modelValue', value)
  emit('update:displayValue', value)
}

function clearSelection() {
  selectedItem.value = null
  isCustomValue.value = false
  searchText.value = ''
  emit('update:modelValue', null)
  emit('update:displayValue', null)
}

function handleBlur() {
  // If user typed something but didn't select from dropdown,
  // treat it as a custom value
  if (searchText.value.trim() && !selectedItem.value && !isCustomValue.value) {
    selectFreeText(searchText.value.trim())
  }
}

function handleClickOutside(event: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

function handleScroll() {
  if (isOpen.value) {
    updateDropdownPosition()
  }
}

onMounted(() => {
  fetchOptions('')
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleScroll)
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
})

watch(
  () => props.modelValue,
  newValue => {
    if (!newValue) {
      selectedItem.value = null
      isCustomValue.value = false
      searchText.value = ''
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

.clear-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #adb5bd;
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  padding: 0;
}

.clear-btn:hover {
  background: #6c757d;
}

/* Dropdown styles are global because Teleport moves element to body */
:global(.concept-typeahead-dropdown) {
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ced4da;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  color: var(--color-ui-darkest-text, #1f425a);
  font-size: 0.8125rem;
}

:global(.concept-typeahead-list) {
  list-style: none;
  margin: 0;
  padding: 0;
}

:global(.concept-typeahead-message) {
  padding: 8px 12px;
  color: var(--color-neutral, #595757);
  font-size: 0.8125rem;
  text-align: center;
}

:global(.concept-typeahead-item) {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:global(.concept-typeahead-item:hover),
:global(.concept-typeahead-item.highlighted) {
  background-color: var(--color-mri-dropdown-list-item-selected, #ebf2f9);
}

:global(.concept-typeahead-text) {
  flex: 1;
  color: var(--color-ui-darkest-text, #1f425a);
}

:global(.concept-typeahead-value) {
  color: var(--color-neutral, #595757);
  font-size: 0.8125rem;
  margin-left: 8px;
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
