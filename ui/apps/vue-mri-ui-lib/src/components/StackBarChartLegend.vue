<template>
  <div class="stackbar-legend-container">
    <ul class="stackbar-legend-entries">
      <li
        v-for="(item, index) in legendItems"
        :key="index"
        class="stackbar-legend-entry"
        @mouseenter="item.isTruncated && showTooltip($event, item.fullName)"
        @mouseleave="hideTooltip"
      >
        <span class="stackbar-legend-entry-box" :style="{ 'background-color': item.color }"></span>
        <span class="stackbar-legend-entry-text">{{ item.displayName }}</span>
      </li>
    </ul>
    <div v-if="tooltipVisible" ref="tooltipRef" class="stackbar-legend-tooltip" :style="tooltipStyle">
      {{ tooltipText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, nextTick } from 'vue'

interface Trace {
  name: string
  meta?: {
    fullName?: string
  }
}

interface Props {
  traces: Trace[]
  colorway: string[]
}

const props = withDefaults(defineProps<Props>(), {
  traces: () => [],
  colorway: () => [],
})

const tooltipVisible = ref(false)
const tooltipText = ref('')
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipStyle = reactive({
  top: '0px',
  left: '0px',
})

const showTooltip = async (event: MouseEvent, fullName: string) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  tooltipText.value = fullName
  tooltipVisible.value = true

  // Wait for DOM update to get tooltip dimensions after it's rendered
  await nextTick()
  if (tooltipRef.value) {
    const tooltipRect = tooltipRef.value.getBoundingClientRect()
    // Position tooltip to the left of the legend item, vertically centered
    tooltipStyle.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`
    tooltipStyle.left = `${rect.left - tooltipRect.width - 8}px`
  }
}

const hideTooltip = () => {
  tooltipVisible.value = false
}

const legendItems = computed(() => {
  // Reverse to match stacking order
  return [...props.traces].reverse().map((trace, index) => {
    const fullName = trace.meta?.fullName || trace.name
    const displayName = trace.name
    return {
      displayName,
      fullName,
      isTruncated: fullName !== displayName,
      color: props.colorway[index % props.colorway.length],
    }
  })
})
</script>

<style scoped>
.stackbar-legend-container {
  position: relative;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #dedede;
  max-height: 100%;
  overflow-y: auto;
  align-self: flex-start;
}
.stackbar-legend-entries {
  list-style: none;
  margin: 0;
  padding: 0;
}
.stackbar-legend-entry {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  cursor: default;
}
.stackbar-legend-entry:last-child {
  margin-bottom: 0;
}
.stackbar-legend-entry-box {
  width: 12px;
  height: 12px;
  min-width: 12px;
  margin-right: 8px;
  border-radius: 2px;
}
.stackbar-legend-entry-text {
  font-size: 12px;
  font-family: 'GT-America', sans-serif;
  color: #000080;
  white-space: nowrap;
}
.stackbar-legend-tooltip {
  position: fixed;
  background: rgba(51, 51, 51, 0.95);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
  width: fit-content;
  max-width: 60ch;
  word-wrap: break-word;
  overflow-wrap: break-word;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}
</style>
