<template>
  <div class="app-segmented-button" v-on:keyup="keymonitor">
    <ul ref="segmentedItemList" class="app-segmented-list" tabindex="-1">
      <template v-for="item in segmentedItems" :key="item.value">
        <li
          v-if="item.value === selected"
          tabindex="0"
          v-on:focus="setFocusItem(item)"
          class="app-segmented-listItem"
          v-bind:class="{
            'app-segmented-listItemSelected': item.value === selected,
            'app-segmented-listItemFocused': item.value === focusedItem.value,
          }"
          @click="selectItem(item)"
        >
          {{ item.text }}
        </li>
        <li
          v-if="item.value !== selected"
          tabindex="-1"
          v-on:focus="setFocusItem(item)"
          class="app-segmented-listItem"
          v-bind:class="{
            'app-segmented-listItemSelected': item.value === selected,
            'app-segmented-listItemFocused': item.value === focusedItem.value,
          }"
          @click="selectItem(item)"
        >
          {{ item.text }}
        </li>
      </template>
    </ul>
  </div>
</template>
<script lang="ts">
export default {
  name: 'app-segmented-button',
}
</script>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

interface SegmentedItem {
  text: string
  value: string
}

interface Props {
  segmentedItems?: SegmentedItem[]
  value?: string
  modelValue?: string
  onSelectedChange?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  segmentedItems: () => [],
  value: undefined,
  modelValue: undefined,
  onSelectedChange: undefined,
})

const emit = defineEmits<{
  input: [value: string]
  'update:modelValue': [value: string]
  onSelectedChange: []
}>()

// Merge both props - modelValue takes precedence for Vue 2/3 compat
const mergedValue = computed(() => {
  return props.modelValue !== undefined ? props.modelValue : (props.value ?? '')
})

// Template refs
const segmentedItemList = ref<HTMLElement | null>(null)

// Internal reactive state
const selected = ref<string>(mergedValue.value)
const focusedItem = ref<SegmentedItem | Record<string, never>>({})

// Watch for external value changes
watch(
  mergedValue,
  val => {
    if (val !== selected.value) {
      selected.value = val
    }
  },
  { immediate: true }
)

// Watch for selected changes to emit events (watcher-based emission pattern)
// Note: flush: 'post' prevents emission during initialization, only emitting on user changes
watch(
  selected,
  val => {
    // Dual emission for Vue 2/3 compatibility during compat mode
    // Once compat mode is disabled, only 'update:modelValue' will be needed
    emit('input', val) // Vue 2 pattern
    emit('update:modelValue', val) // Vue 3 pattern
  },
  { flush: 'post' }
)

// Methods
const selectItem = (item: SegmentedItem) => {
  focusedItem.value = item
  selected.value = item.value
  emit('onSelectedChange')

  if (props.segmentedItems) {
    for (let i = 0; i < props.segmentedItems.length; i += 1) {
      if (props.segmentedItems[i].value === item.value) {
        nextTick(() => {
          setFocusIndex(i)
        })
        break
      }
    }
  }
}

const keymonitor = (event: KeyboardEvent) => {
  const key = event.key
  if (key === ' ' || key === 'Spacebar') {
    selectItem(focusedItem.value as SegmentedItem)
  }
  if (key === 'Right' || key === 'ArrowRight') {
    if (!props.segmentedItems) return

    for (let i = 0; i < props.segmentedItems.length; i += 1) {
      const focusedValue = (focusedItem.value as SegmentedItem).value
      if (focusedValue && props.segmentedItems[i].value === focusedValue) {
        if (props.segmentedItems[i + 1]) {
          focusedItem.value = props.segmentedItems[i + 1]
          setFocusIndex(i + 1)
        }
        break
      }
      if (!focusedValue && props.segmentedItems[i].value === selected.value) {
        if (props.segmentedItems[i + 1]) {
          focusedItem.value = props.segmentedItems[i + 1]
          setFocusIndex(i + 1)
        }
        break
      }
    }
  }
  if (key === 'Left' || key === 'ArrowLeft') {
    if (!props.segmentedItems) return

    for (let i = 0; i < props.segmentedItems.length; i += 1) {
      const focusedValue = (focusedItem.value as SegmentedItem).value
      if (focusedValue && props.segmentedItems[i].value === focusedValue) {
        if (props.segmentedItems[i - 1]) {
          focusedItem.value = props.segmentedItems[i - 1]
          setFocusIndex(i - 1)
        }
        break
      }
      if (!focusedValue && props.segmentedItems[i].value === selected.value) {
        if (props.segmentedItems[i - 1]) {
          focusedItem.value = props.segmentedItems[i - 1]
          setFocusIndex(i - 1)
        }
        break
      }
    }
  }
}

const setFocusIndex = (index: number) => {
  if (
    segmentedItemList.value &&
    segmentedItemList.value.children &&
    segmentedItemList.value.children[index] &&
    (segmentedItemList.value.children[index] as HTMLElement).focus
  ) {
    ;(segmentedItemList.value.children[index] as HTMLElement).focus()
  }
}

const setFocusItem = (item: SegmentedItem) => {
  focusedItem.value = item
}
</script>
