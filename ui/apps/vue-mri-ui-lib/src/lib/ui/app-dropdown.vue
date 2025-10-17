<template>
  <div class="app-dropdown" v-bind:class="{ disabled: disabled }">
    <div
      class="app-dropdown-popover"
      ref="dropdownListMenu"
      v-if="dropdownVisible"
      :style="dropdownListStyle"
      tabindex="0"
      v-on:keyup="monitorKeyDropdownList"
      v-focus
    >
      <ul style="width: 100%; max-width: 100%" class="app-dropdown-list">
        <template v-for="(item, index) in nonEmptyDropdownItems" :key="item.value">
          <li
            v-on:mouseover="onItemHover(index)"
            class="app-dropdown-listItem"
            v-bind:class="{
              'hover-select': index === hoverIndex,
              'app-dropdown-listItemSelected': item.value === selected,
            }"
            @click="selectItem(item)"
          >
            {{ item.text }}
          </li>
        </template>
      </ul>
    </div>
    <div
      class="app-dropdown-container"
      ref="dropdownContainer"
      v-bind:class="{ 'dropdown-active': dropdownVisible }"
      @click="toggleList"
      tabindex="0"
      v-on:keyup="monitorKeyDropdownButton"
    >
      <label v-bind:class="{ placeholder: selectedText.placeholder }" class="app-dropdown-label">
        {{ selectedText.text }}</label
      >
      <button class="app-dropdown-arrow" v-bind:class="{ 'dropdown-active': dropdownVisible }" tabindex="-1"></button>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'app-dropdown',
  compatConfig: {
    MODE: 3, // Run in Vue 3 mode for proper v-model behavior
  },
}
</script>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

interface DropdownItem {
  text: string
  value: string
}

interface Props {
  dropdownItems?: DropdownItem[]
  value?: string
  emptyListText?: string
  emptySelectionText?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  dropdownItems: () => [],
  value: '',
  emptyListText: '',
  emptySelectionText: '',
  disabled: false,
})

const emit = defineEmits<{
  input: [value: string]
  'update:modelValue': [value: string]
  onSelectedChange: []
}>()

// Template refs
const dropdownListMenu = ref<HTMLElement | null>(null)
const dropdownContainer = ref<HTMLElement | null>(null)

// Internal reactive state
const dropdownListStyle = ref<Record<string, string>>({})
const dropdownVisible = ref<boolean>(false)
const selected = ref<string>(props.value)
const hoverIndex = ref<number>(-1)

// Watch for external value changes
watch(
  () => props.value,
  val => {
    if (val !== selected.value) {
      selected.value = val
    }
  },
  { immediate: true }
)

// Watch for selected changes to emit events
watch(selected, val => {
  // Dual emission for Vue 2/3 compatibility during compat mode
  // Once compat mode is disabled, only 'update:modelValue' will be needed
  emit('input', val) // Vue 2 pattern
  emit('update:modelValue', val) // Vue 3 pattern
})

// Computed properties
const nonEmptyDropdownItems = computed(() => {
  if (props.dropdownItems && props.dropdownItems.length > 0) {
    return props.dropdownItems
  }
  return [{ text: '', value: '' }]
})

const selectedText = computed(() => {
  const displayText = {
    text: '',
    placeholder: true,
  }
  if (props.emptySelectionText) {
    displayText.text = props.emptySelectionText
  }
  const dropdownItems = props.dropdownItems
  const selectedKey = selected.value
  if (!dropdownItems || dropdownItems.length === 0) {
    if (props.emptyListText) {
      displayText.text = props.emptyListText
    }
    return displayText
  }
  for (let i = 0; i < dropdownItems.length; i += 1) {
    if (dropdownItems[i].value === selectedKey) {
      displayText.text = dropdownItems[i].text
      displayText.placeholder = false
      break
    }
  }
  return displayText
})

// Methods
const monitorKeyDropdownList = (event: KeyboardEvent) => {
  const key = event.key
  if (key === 'Escape' || key === 'Esc') {
    dropdownVisible.value = false
    event.stopImmediatePropagation()
    nextTick(() => {
      dropdownContainer.value?.focus()
    })
  }
  if (key === 'Down' || key === 'ArrowDown') {
    hoverNextItem(1)
  }
  if (key === 'Up' || key === 'ArrowUp') {
    hoverNextItem(-1)
  }
  if (key === ' ' || key === 'Spacebar') {
    if (props.dropdownItems && props.dropdownItems[hoverIndex.value]) {
      selectItem(props.dropdownItems[hoverIndex.value])
    }
  }
}

const hoverNextItem = (increment: number) => {
  if (props.dropdownItems && props.dropdownItems.length > 0) {
    hoverIndex.value += increment === 0 ? 1 : increment
    if (hoverIndex.value >= props.dropdownItems.length) {
      hoverIndex.value = 0
    }
    if (hoverIndex.value < 0) {
      hoverIndex.value = props.dropdownItems.length - 1
    }
  }
}

const onItemHover = (idx: number) => {
  hoverIndex.value = idx
}

const monitorKeyDropdownButton = (event: KeyboardEvent) => {
  const key = event.key
  if (key === ' ' || key === 'Spacebar') {
    toggleList()
    hoverIndex.value = 0
  }
}

const closeSelectionMenu = (event: MouseEvent) => {
  if (
    dropdownVisible.value &&
    dropdownListMenu.value &&
    !dropdownListMenu.value.contains(event.target as Node) &&
    dropdownContainer.value &&
    !dropdownContainer.value.contains(event.target as Node)
  ) {
    dropdownVisible.value = false
  }
}

const repositionDropdownPopover = () => {
  if (!dropdownContainer.value) return

  const rightLocation = dropdownContainer.value.getBoundingClientRect().right
  const leftLocation = dropdownContainer.value.getBoundingClientRect().left
  const topLocation = dropdownContainer.value.getBoundingClientRect().top
  const bottomLocation = window.innerHeight - topLocation

  let dropdownListHeight = 40
  if (props.dropdownItems && props.dropdownItems.length > 0) {
    dropdownListHeight = 40 * props.dropdownItems.length
  }
  dropdownListHeight += 2

  if (dropdownListHeight > topLocation) {
    dropdownListStyle.value = {
      top: '8px',
      width: `${rightLocation - leftLocation}px`,
      height: `${topLocation - 8}px`,
    }
  } else {
    dropdownListStyle.value = {
      bottom: `${bottomLocation}px`,
      width: `${rightLocation - leftLocation}px`,
      height: `${dropdownListHeight}px`,
    }
  }
}

const toggleList = () => {
  if (props.disabled) {
    return
  }
  dropdownVisible.value = !dropdownVisible.value
  if (dropdownVisible.value) {
    repositionDropdownPopover()
  }
}

const selectItem = (item: DropdownItem) => {
  selected.value = item.value
  dropdownVisible.value = false
  emit('onSelectedChange')
  nextTick(() => {
    dropdownContainer.value?.focus()
  })
}

// Lifecycle hooks
onMounted(() => {
  nextTick(() => {
    window.addEventListener('resize', repositionDropdownPopover)
    window.addEventListener('click', closeSelectionMenu)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', repositionDropdownPopover)
  window.removeEventListener('click', closeSelectionMenu)
})
</script>
