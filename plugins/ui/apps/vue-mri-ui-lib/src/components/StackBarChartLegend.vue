<template>
  <div class="stackbar-legend-container">
    <ul class="stackbar-legend-entries">
      <li
        v-for="(item, index) in legendItems"
        :key="index"
        class="stackbar-legend-entry"
        tabindex="0"
        :aria-label="item.ariaLabel"
        @mouseenter="item.isTruncated && showTooltip($event, item.fullName)"
        @mouseleave="hideTooltip"
        @focus="item.isTruncated && showTooltip($event, item.fullName)"
        @blur="hideTooltip"
      >
        <span v-if="item.kind === 'bar'" class="stackbar-legend-entry-box" :style="barSwatchStyle(item.color)"></span>
        <span v-else class="stackbar-legend-entry-line" :style="{ 'background-color': item.color }"></span>
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
  barOpacity?: number
  showDistributionCurve?: boolean
  // When true, bar swatches render as area-fill square (translucent fill + solid border)
  areaFill?: boolean
  // Hex alpha suffix used for the translucent fill
  fillAlpha?: string
}

const props = withDefaults(defineProps<Props>(), {
  traces: () => [],
  colorway: () => [],
  barOpacity: 1,
  showDistributionCurve: false,
  areaFill: false,
  fillAlpha: '30',
})

const barSwatchStyle = (color: string) => {
  if (props.areaFill) {
    return {
      'background-color': color + props.fillAlpha,
      border: `1px solid ${color}`,
    }
  }
  return {
    'background-color': color,
    opacity: props.barOpacity,
  }
}

const tooltipVisible = ref(false)
const tooltipText = ref('')
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipStyle = reactive({
  top: '0px',
  left: '0px',
})

const showTooltip = async (event: MouseEvent | FocusEvent, fullName: string) => {
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
  const totalTraces = props.traces.length
  // Reverse to match stacking order (top of stack shown first in legend)
  const reversed = [...props.traces].reverse()

  const makeItem = (kind: 'bar' | 'curve', trace: Trace, index: number) => {
    const originalIndex = totalTraces - 1 - index
    const fullName = trace.meta?.fullName || trace.name
    const displayName = trace.name
    return {
      kind,
      displayName,
      fullName,
      // append distribution to relevant aria-label for screen reader clarity
      ariaLabel: kind === 'curve' ? `${fullName} distribution` : fullName,
      isTruncated: fullName !== displayName,
      color: props.colorway.length > 0 ? props.colorway[originalIndex % props.colorway.length] : '#cccccc',
    }
  }

  const barItems = reversed.map((trace, index) => makeItem('bar', trace, index))

  if (!props.showDistributionCurve) return barItems

  // Distribution curve legend items share the same labels and colors as the bars
  const curveItems = reversed.map((trace, index) => makeItem('curve', trace, index))
  return [...barItems, ...curveItems]
})
</script>

<style scoped>
.stackbar-legend-container {
  position: relative;
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 4px;
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
.stackbar-legend-entry:focus {
  outline: 2px solid #4d90fe;
  outline-offset: 2px;
  border-radius: 2px;
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
  box-sizing: border-box;
}
.stackbar-legend-entry-line {
  width: 12px;
  height: 2px;
  min-width: 12px;
  margin-right: 8px;
  border-radius: 1px;
}
.stackbar-legend-entry-text {
  font-size: 12px;
  font-family: var(--app-font-family);
  color: #000080;
  white-space: nowrap;
}
.stackbar-legend-tooltip {
  position: fixed;
  background: #f9f9f9;
  color: #000080;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #dedede;
  font-size: 12px;
  font-family: var(--app-font-family);
  white-space: pre-wrap;
  width: fit-content;
  max-width: 62ch;
  word-wrap: break-word;
  overflow-wrap: break-word;
  text-align: left;
  z-index: 10000;
  pointer-events: none;
}
</style>
