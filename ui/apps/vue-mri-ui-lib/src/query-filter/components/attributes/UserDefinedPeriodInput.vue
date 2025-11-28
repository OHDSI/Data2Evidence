<script setup lang="ts">
import AppDate from '@/lib/ui/app-date.vue'
import { onMounted, ref, watch } from 'vue'
import { formatDateToYMD, parseDate } from '../../utils/DateUtils'

const props = defineProps<{
  value?: { StartDate: string; EndDate: string }
}>()

const emit = defineEmits<{
  (e: 'update', value: { StartDate: string; EndDate: string }): void
}>()

const startDateModel = ref<string | Date>('')
const endDateModel = ref<string | Date>('')

onMounted(() => {
  if (props.value) {
    startDateModel.value = parseDate(props.value.StartDate) || ''
    endDateModel.value = parseDate(props.value.EndDate) || ''
  }
})

watch(
  props.value,
  newValue => {
    if (newValue) {
      startDateModel.value = parseDate(newValue.StartDate) || ''
      endDateModel.value = parseDate(newValue.EndDate) || ''
    }
  },
  { immediate: true }
)

watch(
  [startDateModel, endDateModel],
  ([startDate, endDate]) => {
    const payload: { StartDate: string; EndDate: string } = {
      StartDate: startDate ? formatDateToYMD(startDate) : '',
      EndDate: endDate ? formatDateToYMD(endDate) : '',
    }
    emit('update', payload)
  },
  { immediate: true }
)

const updateStartDateModel = (payload: { date: string | Date; isEmpty: boolean }) => {
  startDateModel.value = formatDateToYMD(payload.date)
}

const updateEndDateModel = (payload: { date: string | Date; isEmpty: boolean }) => {
  endDateModel.value = formatDateToYMD(payload.date)
}
</script>

<template>
  <div class="user-defined-input-container">
    <div>starting</div>
    <div class="date-selection-container">
      <AppDate :date="startDateModel" @update="updateStartDateModel" />
    </div>
    <div>and ending</div>
    <div class="date-selection-container">
      <AppDate :date="endDateModel" @update="updateEndDateModel" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.user-defined-input-container {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  min-height: 40px;
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
