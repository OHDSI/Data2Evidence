<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import AppDate from '@/lib/ui/app-date.vue'
import SelectMaterial from '../SelectMaterial.vue'
import { dateRangeOptions } from '../../utils/AtlasUtils'
import { computed, nextTick, ref, watch } from 'vue'
import { formatDateToYMD, parseDate } from '../../utils/DateUtils'

// Props now use internal format: operator (string like 'GREATER_THAN'), value (ISO date string), and extent (ISO date string)
const props = defineProps<{
  value?: string
  operator?: string
  extent?: string
}>()

// Emit internal format: operator and value as strings
const emit = defineEmits<{
  (e: 'update', payload: { operator: string; value: string; extent?: string }): void
}>()

// Internal state uses Atlas format for the dropdown compatibility
const dateRangeModel = ref<string>('lt')
const dateValueModel = ref<string | Date>('')
const dateExtentModel = ref<string | Date>('')

const isDualDateRange = computed(() => {
  return dateRangeModel.value === 'btw' || dateRangeModel.value === '!btw'
})

// Convert internal operator format to Atlas format for dropdown
const internalToAtlasOperator = (internal: string): string => {
  const map: Record<string, string> = {
    GREATER_THAN: 'gt',
    LESS_THAN: 'lt',
    GREATER_THAN_OR_EQUAL: 'gte',
    LESS_THAN_OR_EQUAL: 'lte',
    EQUAL: 'eq',
    BETWEEN: 'btw',
    NOT_BETWEEN: '!btw',
  }
  return map[internal] || 'lt'
}

// Convert Atlas operator format to internal format
const atlasToInternalOperator = (atlas: string): string => {
  const map: Record<string, string> = {
    gt: 'GREATER_THAN',
    lt: 'LESS_THAN',
    gte: 'GREATER_THAN_OR_EQUAL',
    lte: 'LESS_THAN_OR_EQUAL',
    eq: 'EQUAL',
    btw: 'BETWEEN',
    '!btw': 'NOT_BETWEEN',
  }
  return map[atlas] || 'LESS_THAN'
}

// Initialize from props
if (props.operator) {
  dateRangeModel.value = internalToAtlasOperator(props.operator)
}

// Use nextTick to set both value and extent to ensure proper rendering
nextTick(() => {
  if (props.value) {
    dateValueModel.value = parseDate(props.value) || ''
  }
  if (props.extent) {
    dateExtentModel.value = parseDate(props.extent) || ''
  }
})

watch(
  () => [props.operator, props.value, props.extent],
  ([newOperator, newValue, newExtent]) => {
    if (newOperator) {
      dateRangeModel.value = internalToAtlasOperator(newOperator)
    }
    if (newValue) {
      dateValueModel.value = parseDate(newValue) || ''
    }
    if (newExtent) {
      dateExtentModel.value = parseDate(newExtent) || ''
    }
  }
)

watch(
  [dateRangeModel, dateValueModel, dateExtentModel, isDualDateRange],
  ([range, value, extent, dual]) => {
    const payload: { operator: string; value: string; extent?: string } = {
      operator: atlasToInternalOperator(range),
      value: value ? formatDateToYMD(value) : '',
    }
    if (dual && extent) {
      payload.extent = extent ? formatDateToYMD(extent) : ''
    } else {
      dateExtentModel.value = ''
    }
    emit('update', payload)
  },
  { immediate: false } // Don't emit on mount - wait for props to be set first
)
const updateDateValueModel = (payload: { date: string | Date; isEmpty: boolean }) => {
  dateValueModel.value = payload.date
}

const updateDateExtentModel = (payload: { date: string | Date; isEmpty: boolean }) => {
  dateExtentModel.value = payload.date
}
</script>

<template>
  <div class="date-input-container">
    <div class="select-container">
      <SelectMaterial v-model="dateRangeModel" :options="dateRangeOptions" label="Select an option" />
    </div>
    <div class="date-selection-container">
      <AppDate :date="dateValueModel" @update="updateDateValueModel" />
    </div>

    <div v-if="isDualDateRange" class="date-connector">and</div>
    <div v-if="isDualDateRange" class="date-selection-container">
      <AppDate :date="dateExtentModel" @update="updateDateExtentModel" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.date-input-container {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  max-height: 40px;

  .select-container {
    display: flex;
    align-items: center;
    .select-wrapper {
      width: 150px;
    }
  }
  .date-connector {
    align-self: center;
  }
  .date-selection-container {
    height: 100%;
    display: flex;
    align-items: center;
    ::v-deep(.app-date .form-control) {
      min-height: 100%;
    }
    .app-date.form-group {
      margin: 0px;
      height: 100%;
    }
  }
}
</style>
