<template>
  <div class="temporal-relationship-section">
    <!-- StartWindow -->
    <div class="window-row">
      <span class="label">where</span>
      <select
        :value="String(startWindow.useEventEnd)"
        @change="updateStartWindow('useEventEnd', ($event.target as HTMLSelectElement).value === 'true')"
        class="temporal-select"
      >
        <option value="false">event starts</option>
        <option value="true">event ends</option>
      </select>
      <span class="label">between</span>

      <select
        :value="startWindow.start.days === null ? 'null' : String(startWindow.start.days)"
        @change="
          updateStartWindowStart(
            'days',
            ($event.target as HTMLSelectElement).value === 'null'
              ? null
              : Number(($event.target as HTMLSelectElement).value)
          )
        "
        class="temporal-select days-select"
      >
        <option value="null">all</option>
        <option v-for="day in startWindowStartDayOptions" :key="day" :value="day">{{ day }}</option>
      </select>
      <span class="label">days</span>

      <select
        :value="String(startWindow.start.coeff)"
        @change="updateStartWindowStart('coeff', Number(($event.target as HTMLSelectElement).value) as -1 | 1)"
        class="temporal-select"
      >
        <option value="-1">Before</option>
        <option value="1">After</option>
      </select>

      <span class="label">and</span>

      <select
        :value="startWindow.end.days === null ? 'null' : String(startWindow.end.days)"
        @change="
          updateStartWindowEnd(
            'days',
            ($event.target as HTMLSelectElement).value === 'null'
              ? null
              : Number(($event.target as HTMLSelectElement).value)
          )
        "
        class="temporal-select days-select"
      >
        <option value="null">all</option>
        <option v-for="day in startWindowEndDayOptions" :key="day" :value="day">{{ day }}</option>
      </select>
      <span class="label">days</span>

      <select
        :value="String(startWindow.end.coeff)"
        @change="updateStartWindowEnd('coeff', Number(($event.target as HTMLSelectElement).value) as -1 | 1)"
        class="temporal-select"
      >
        <option value="-1">Before</option>
        <option value="1">After</option>
      </select>

      <select
        :value="String(startWindow.useIndexEnd)"
        @change="updateStartWindow('useIndexEnd', ($event.target as HTMLSelectElement).value === 'true')"
        class="temporal-select"
      >
        <option value="false">index start date</option>
        <option value="true">index end date</option>
      </select>
    </div>

    <!-- EndWindow (optional) -->
    <div v-if="endWindow" class="window-row">
      <span class="label">and</span>
      <select
        :value="String(endWindow.useEventEnd)"
        @change="updateEndWindow('useEventEnd', ($event.target as HTMLSelectElement).value === 'true')"
        class="temporal-select"
      >
        <option value="false">event starts</option>
        <option value="true">event ends</option>
      </select>
      <span class="label">between</span>

      <select
        :value="endWindow.start.days === null ? 'null' : String(endWindow.start.days)"
        @change="
          updateEndWindowStart(
            'days',
            ($event.target as HTMLSelectElement).value === 'null'
              ? null
              : Number(($event.target as HTMLSelectElement).value)
          )
        "
        class="temporal-select days-select"
      >
        <option value="null">all</option>
        <option v-for="day in endWindowStartDayOptions" :key="day" :value="day">{{ day }}</option>
      </select>
      <span class="label">days</span>

      <select
        :value="String(endWindow.start.coeff)"
        @change="updateEndWindowStart('coeff', Number(($event.target as HTMLSelectElement).value) as -1 | 1)"
        class="temporal-select"
      >
        <option value="-1">Before</option>
        <option value="1">After</option>
      </select>

      <span class="label">and</span>

      <select
        :value="endWindow.end.days === null ? 'null' : String(endWindow.end.days)"
        @change="
          updateEndWindowEnd(
            'days',
            ($event.target as HTMLSelectElement).value === 'null'
              ? null
              : Number(($event.target as HTMLSelectElement).value)
          )
        "
        class="temporal-select days-select"
      >
        <option value="null">all</option>
        <option v-for="day in endWindowEndDayOptions" :key="day" :value="day">{{ day }}</option>
      </select>
      <span class="label">days</span>

      <select
        :value="String(endWindow.end.coeff)"
        @change="updateEndWindowEnd('coeff', Number(($event.target as HTMLSelectElement).value) as -1 | 1)"
        class="temporal-select"
      >
        <option value="-1">Before</option>
        <option value="1">After</option>
      </select>

      <select
        :value="String(endWindow.useIndexEnd)"
        @change="updateEndWindow('useIndexEnd', ($event.target as HTMLSelectElement).value === 'true')"
        class="temporal-select"
      >
        <option value="false">index start date</option>
        <option value="true">index end date</option>
      </select>
      <button @click="removeEndWindow" class="remove-btn" title="Remove constraint">✕</button>
    </div>

    <!-- Add additional constraint link -->
    <div v-else class="add-constraint">
      <a href="#" @click.prevent="addEndWindow" class="add-link">add additional constraint</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QueryFilterEvent, WindowDefinition } from '../types/QueryFilterTypes'

interface Props {
  event: QueryFilterEvent
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [event: QueryFilterEvent]
}>()

// Helper function to get default window
function getDefaultWindow(): WindowDefinition {
  return {
    start: { days: null, coeff: -1 },
    end: { days: 0, coeff: 1 },
    useIndexEnd: false,
    useEventEnd: false,
  }
}

// Standard day options
const standardDayOptions = [null, 0, 1, 7, 14, 21, 30, 60, 90, 120, 180, 365, 548, 730, 1095]

// Computed values that read directly from props
const startWindow = computed(() => props.event.startWindow || getDefaultWindow())
const endWindow = computed(() => props.event.endWindow || null)

// Day options that include current values if they're not in the standard list
const startWindowStartDayOptions = computed(() => {
  const days = startWindow.value.start.days
  if (days !== null && !standardDayOptions.includes(days)) {
    return [...standardDayOptions.filter(d => d !== null).sort((a, b) => a - b), days].sort((a, b) => a - b)
  }
  return standardDayOptions.filter(d => d !== null)
})

const startWindowEndDayOptions = computed(() => {
  const days = startWindow.value.end.days
  if (days !== null && !standardDayOptions.includes(days)) {
    return [...standardDayOptions.filter(d => d !== null).sort((a, b) => a - b), days].sort((a, b) => a - b)
  }
  return standardDayOptions.filter(d => d !== null)
})

const endWindowStartDayOptions = computed(() => {
  if (!endWindow.value) return []
  const days = endWindow.value.start.days
  if (days !== null && !standardDayOptions.includes(days)) {
    return [...standardDayOptions.filter(d => d !== null).sort((a, b) => a - b), days].sort((a, b) => a - b)
  }
  return standardDayOptions.filter(d => d !== null)
})

const endWindowEndDayOptions = computed(() => {
  if (!endWindow.value) return []
  const days = endWindow.value.end.days
  if (days !== null && !standardDayOptions.includes(days)) {
    return [...standardDayOptions.filter(d => d !== null).sort((a, b) => a - b), days].sort((a, b) => a - b)
  }
  return standardDayOptions.filter(d => d !== null)
})

// Update functions that emit new state
function updateStartWindow(field: 'useEventEnd' | 'useIndexEnd', value: boolean) {
  emit('update', {
    ...props.event,
    startWindow: {
      ...startWindow.value,
      [field]: value,
    },
    endWindow: endWindow.value || undefined,
  })
}

function updateStartWindowStart(field: 'days' | 'coeff', value: number | null | -1 | 1) {
  emit('update', {
    ...props.event,
    startWindow: {
      ...startWindow.value,
      start: {
        ...startWindow.value.start,
        [field]: value,
      },
    },
    endWindow: endWindow.value || undefined,
  })
}

function updateStartWindowEnd(field: 'days' | 'coeff', value: number | null | -1 | 1) {
  emit('update', {
    ...props.event,
    startWindow: {
      ...startWindow.value,
      end: {
        ...startWindow.value.end,
        [field]: value,
      },
    },
    endWindow: endWindow.value || undefined,
  })
}

function updateEndWindow(field: 'useEventEnd' | 'useIndexEnd', value: boolean) {
  if (!endWindow.value) return

  emit('update', {
    ...props.event,
    startWindow: startWindow.value,
    endWindow: {
      ...endWindow.value,
      [field]: value,
    },
  })
}

function updateEndWindowStart(field: 'days' | 'coeff', value: number | null | -1 | 1) {
  if (!endWindow.value) return

  emit('update', {
    ...props.event,
    startWindow: startWindow.value,
    endWindow: {
      ...endWindow.value,
      start: {
        ...endWindow.value.start,
        [field]: value,
      },
    },
  })
}

function updateEndWindowEnd(field: 'days' | 'coeff', value: number | null | -1 | 1) {
  if (!endWindow.value) return

  emit('update', {
    ...props.event,
    startWindow: startWindow.value,
    endWindow: {
      ...endWindow.value,
      end: {
        ...endWindow.value.end,
        [field]: value,
      },
    },
  })
}

function addEndWindow() {
  emit('update', {
    ...props.event,
    startWindow: startWindow.value,
    endWindow: getDefaultWindow(),
  })
}

function removeEndWindow() {
  emit('update', {
    ...props.event,
    startWindow: startWindow.value,
    endWindow: undefined,
  })
}
</script>

<style scoped>
.temporal-relationship-section {
  padding: 12px 0;
  border-top: 1px solid #e0e0e0;
  font-size: 14px;
}

.window-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.label {
  color: #333;
  font-weight: 400;
}

.temporal-select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.temporal-select:hover {
  border-color: #999;
}

.temporal-select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

.days-select {
  min-width: 60px;
}

.remove-btn {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  transition: background-color 0.2s;
}

.remove-btn:hover {
  background-color: #d32f2f;
}

.add-constraint {
  margin: 8px 0;
}

.add-link {
  color: #0066cc;
  text-decoration: none;
  font-style: italic;
  font-size: 13px;
}

.add-link:hover {
  text-decoration: underline;
}
</style>
