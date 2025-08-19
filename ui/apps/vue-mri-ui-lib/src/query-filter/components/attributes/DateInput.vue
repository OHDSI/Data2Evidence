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
import { computed, onMounted, ref, watch } from 'vue'
import { formatDateToYMD, parseDate } from '../../utils/DateUtils'

const props = defineProps<{
  value?: { Op: string; Value: string; Extent?: string }
}>()
const emit = defineEmits<{
  (e: 'update', value: { Op: string; Value: string; Extent?: string }): void
}>()

const dateRangeModel = ref<string>('lt')
const dateValueModel = ref<string | Date>('')
const dateExtentModel = ref<string | Date>('')

const isDualDateRange = computed(() => {
  return dateRangeModel.value === 'btw' || dateRangeModel.value === '!btw'
})

onMounted(() => {
  if (props.value) {
    dateRangeModel.value = props.value.Op || 'lt'
    dateValueModel.value = parseDate(props.value.Value) || ''
    dateExtentModel.value = parseDate(props.value.Extent) || ''
  }
})

watch(
  props.value,
  newValue => {
    if (newValue) {
      dateRangeModel.value = newValue.Op || 'lt'
      dateValueModel.value = parseDate(newValue.Value) || ''
      dateExtentModel.value = parseDate(newValue.Extent) || ''
    }
  },
  { immediate: true }
)

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

