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
import { computed, ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'update', value: { Op: string; Value: string; Extent?: string }): void
}>()

const dateRangeModel = ref<string>('lt')
const dateValueModel = ref<string | Date>('')
const dateExtentModel = ref<string | Date>('')

const dateRangeOptions = [
  { label: 'Before', value: 'lt' },
  { label: 'On or Before', value: 'lte' },
  { label: 'On', value: 'eq' },
  { label: 'After', value: 'gt' },
  { label: 'On or After', value: 'gte' },
  { label: 'Between', value: 'btw' },
  { label: 'Not Between', value: '!btw' },
]

const isDualDateRange = computed(() => {
  return dateRangeModel.value === 'btw' || dateRangeModel.value === '!btw'
})

// Watch for changes and emit formatted state
watch(
  [dateRangeModel, dateValueModel, dateExtentModel, isDualDateRange],
  ([range, value, extent, dual]) => {
    const payload: { Op: string; Value: string; Extent?: string } = {
      Op: range,
      Value: value ? formatDateToYMD(value) : '',
    }
    if (dual && extent) {
      payload.Extent = extent ? formatDateToYMD(extent) : ''
    } else {
      dateExtentModel.value = ''
    }
    emit('update', payload)
  },
  { immediate: true }
)

function formatDateToYMD(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const updateDateValueModel = (payload: { date: string | Date; isEmpty: boolean }) => {
  dateValueModel.value = formatDateToYMD(payload.date)
}

const updateDateExtentModel = (payload: { date: string | Date; isEmpty: boolean }) => {
  dateExtentModel.value = formatDateToYMD(payload.date)
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
    }
  }
}
</style>

