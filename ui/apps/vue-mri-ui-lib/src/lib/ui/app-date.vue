<template>
  <div class="app-date form-group">
    <app-label v-if="text" :text="text" />
    <span v-if="!isValid || errMsg" class="errortext">{{ errMsg }}</span>
    <div
      class="d-flex form-control form-control-sm date-container"
      :class="{ invalidDate: !isValid || errMsg, MriHilite: isActive }"
    >
      <div class="app-date__trigger">
        <input
          v-model="displayValue"
          :placeholder="placeholder"
          :class="inputClasses"
          :readonly="false"
          :tabindex="0"
          @keyup.enter="onKeyEnter"
          @focus="onInputFocus"
          @blur="onInputBlur"
        />
        <div ref="calendarButton" class="app-date__icon" @click="togglePicker">
          <appIcon icon="calendar" />
        </div>
      </div>

      <!-- Hidden VueDatePicker for calendar functionality -->
      <VueDatePicker
        ref="datepicker"
        v-bind="datePickerProps"
        @update:model-value="onValueUpdate"
        @closed="onClosed"
        @cleared="onCleared"
        class="dp-hidden-input"
      />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import moment from 'moment'
import appIcon from './app-icon.vue'
import appLabel from './app-label.vue'

// Component configuration
defineOptions({
  name: 'AppDate',
})

// Props
interface Props {
  date?: Date | string | null
  config?: {
    format?: string
    inline?: boolean
    enableTime?: boolean
    range?: boolean
    [key: string]: any
  }
  text?: string
  placeholder?: string
  datetype?: string
  errMsg?: string
  disabled?: boolean
  clearable?: boolean
  autoApply?: boolean
  textInput?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  date: null,
  config: () => ({
    format: 'YYYY-MM-DD',
    inline: false,
  }),
  text: '',
  placeholder: '',
  datetype: '',
  errMsg: '',
  disabled: false,
  clearable: true,
  autoApply: true,
  textInput: true,
})

// Emits
const emit = defineEmits<{
  update: [{ date: Date | string | null; isEmpty: boolean }]
}>()

// Inline utility functions
const momentToDateFnsFormat = (momentFormat: string): string => {
  return momentFormat
    .replace(/YYYY/g, 'yyyy')
    .replace(/DD/g, 'dd')
    .replace(/MM/g, 'MM')
    .replace(/HH/g, 'HH')
    .replace(/mm/g, 'mm')
    .replace(/ss/g, 'ss')
}

const isDate = (value: unknown): boolean => {
  if (value instanceof Date) {
    return !isNaN(value.getTime())
  }
  if (typeof value === 'string') {
    const date = new Date(value)
    return !isNaN(date.getTime())
  }
  return false
}

const normalizeValue = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) {
    return isDate(value) ? value : null
  }
  if (typeof value === 'string') {
    try {
      const date = new Date(value)
      return isDate(date) ? date : null
    } catch {
      return null
    }
  }
  return null
}

const isDifferent = (date1: unknown, date2: unknown): boolean => {
  let dDate1: unknown = date1
  let dDate2: unknown = date2
  if (isDate(dDate1)) {
    dDate1 = new Date(dDate1 as string | number | Date).getTime()
  }
  if (isDate(dDate2)) {
    dDate2 = new Date(dDate2 as string | number | Date).getTime()
  }
  return dDate1 !== dDate2
}

// Reactive state
const internalValue = ref<Date | string | null>(null)
const displayValue = ref('')
const isValid = ref(true)
const isActive = ref(false)
const tempDate = ref<Date | string | null>(null)
const datepicker = ref()

// Computed properties
const defaultConfig = computed(() => ({
  format: 'YYYY-MM-DD',
  inline: false,
  enableTime: false,
  range: false,
}))

const mergedConfig = computed(() => ({
  ...defaultConfig.value,
  ...props.config,
}))

const displayFormat = computed(() => {
  const format = mergedConfig.value.format
  return momentToDateFnsFormat(format)
})

const enableTime = computed(() => {
  const format = mergedConfig.value.format
  return format.includes('HH:mm') || format.includes('HH:mm:ss') || mergedConfig.value.enableTime
})

const isRange = computed(() => mergedConfig.value.range)

const keepActionRow = computed(() => !props.autoApply || enableTime.value)

const inputClasses = computed(() => [
  'mr-auto',
  {
    invalidDate: !isValid.value || props.errMsg,
  },
])

const customUI = computed(() => ({
  input: 'dp-custom-input',
  inputIcon: 'dp-custom-input-icon',
  menu: 'dp-custom-menu',
  calendar: 'dp-custom-calendar',
  calendarCell: 'dp-custom-cell',
  calendarCellSelected: 'dp-custom-cell-selected',
  calendarHeader: 'dp-custom-header',
  timePicker: 'dp-custom-time',
}))

const datePickerProps = computed(() => ({
  modelValue: internalValue.value,
  format: displayFormat.value,
  enableTimePicker: enableTime.value,
  timePickerInline: enableTime.value,
  startTime: { hours: 0, minutes: 0, seconds: 0 },
  range: isRange.value,
  disabled: props.disabled,
  clearable: props.clearable,
  closeOnScroll: false,
  autoApply: props.autoApply,
  teleport: 'body',
  inline: false,
  ui: customUI.value,
  keepActionRow: keepActionRow.value,
  menuClassName: 'app-date-menu',
}))

// Watch for prop changes
watch(
  () => props.date,
  newDate => {
    updateInternalValue(newDate)
  },
  { immediate: true }
)

watch(
  internalValue,
  newValue => {
    updateDisplayValue(newValue)
  },
  { immediate: true }
)

// Methods
const updateInternalValue = (date: Date | string | null) => {
  if (date instanceof Date && !isNaN(date.getTime())) {
    internalValue.value = date
  } else if (typeof date === 'string' && date.trim() !== '') {
    if (isDate(date)) {
      internalValue.value = new Date(date)
    } else {
      internalValue.value = date
    }
  } else {
    internalValue.value = null
  }
}

const updateDisplayValue = (value: Date | string | null) => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    displayValue.value = moment(value).format(mergedConfig.value.format)
  } else if (typeof value === 'string' && value.trim() !== '') {
    if (!isActive.value && isDate(value)) {
      displayValue.value = moment(value).format(mergedConfig.value.format)
    } else {
      displayValue.value = value
    }
  } else {
    displayValue.value = ''
  }
}

const onValueUpdate = (value: Date | string | null) => {
  const normalizedValue = normalizeValue(value)
  internalValue.value = normalizedValue

  if (normalizedValue) {
    isValid.value = true
    emit('update', { date: normalizedValue, isEmpty: false })
  } else {
    isValid.value = true
    emit('update', { date: '', isEmpty: true })
  }
}

const onInputFocus = () => {
  isActive.value = true
  tempDate.value = props.date
}

const onInputBlur = () => {
  isActive.value = false
  if (isDifferent(tempDate.value, props.date)) {
    commitDate(displayValue.value)
  }
}

const onKeyEnter = (event: KeyboardEvent) => {
  const target = event.target as HTMLInputElement
  commitDate(target.value)
}

const commitDate = (dateVal: string) => {
  if (dateVal === '') {
    isValid.value = true
    emit('update', { date: '', isEmpty: true })
  } else {
    const momentDate = moment(dateVal, mergedConfig.value.format, true)
    if (momentDate.isValid()) {
      isValid.value = true
      const date = momentDate.toDate()
      internalValue.value = date
      emit('update', { date, isEmpty: false })
    } else {
      isValid.value = false
      emit('update', { date: dateVal, isEmpty: false })
    }
  }
}

const onClosed = () => {
  isActive.value = false
}

const onCleared = () => {
  internalValue.value = null
  displayValue.value = ''
  isValid.value = true
  emit('update', { date: '', isEmpty: true })
}

const togglePicker = () => {
  if (datepicker.value) {
    datepicker.value.openMenu()
  }
}

// Expose methods for compatibility
defineExpose({
  focus: () => {
    if (datepicker.value) {
      datepicker.value.focus()
    }
  },
  openMenu: () => {
    if (datepicker.value) {
      datepicker.value.openMenu()
    }
  },
  closeMenu: () => {
    if (datepicker.value) {
      datepicker.value.closeMenu()
    }
  },
})
</script>

<style lang="scss" scoped>
.app-date {
  .date-container {
    position: relative;
    padding: 0;

    .app-date__trigger {
      display: flex;
      align-items: center;
      width: 100%;

      input {
        flex: 1;
        border: none;
        outline: none;
        padding: 0.375rem 0.75rem;
        background: transparent;

        &::placeholder {
          color: #6c757d;
        }

        &:focus {
          outline: none;
        }
      }

      .app-date__icon {
        padding: 0.375rem 0.75rem;
        cursor: pointer;
        color: #6c757d;

        &:hover {
          color: #495057;
        }
      }
    }

    &.invalidDate {
      border-color: #dc3545;
    }

    &.MriHilite {
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }
  }

  .errortext {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
}

// Global styles for @vuepic/vue-datepicker customization
:deep(.dp__theme_light) {
  --dp-background-color: #ffffff;
  --dp-text-color: #212529;
  --dp-hover-color: #f8f9fa;
  --dp-hover-text-color: #212529;
  --dp-hover-icon-color: #6c757d;
  --dp-primary-color: #007bff;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #6c757d;
  --dp-border-color: #dee2e6;
  --dp-menu-border-color: #dee2e6;
  --dp-border-color-hover: #007bff;
  --dp-disabled-color: #e9ecef;
  --dp-scroll-bar-background: #f8f9fa;
  --dp-scroll-bar-color: #6c757d;
  --dp-success-color: #28a745;
  --dp-success-color-disabled: #d4edda;
  --dp-icon-color: #6c757d;
  --dp-danger-color: #dc3545;
  --dp-highlight-color: rgba(0, 123, 255, 0.1);
}

// Hide the VueDatePicker input but keep the menu functionality
.dp-hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;

  :deep(.dp__input_wrapper) {
    display: none;
  }

  :deep(.dp__input) {
    display: none;
  }
}

:deep(.dp__menu) {
  border-radius: 0.375rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  border: 1px solid var(--dp-border-color);
  z-index: 1000;
  position: absolute;
}

// Position the menu relative to the input container
:deep(.app-date-menu) {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
}

:deep(.dp-custom-calendar) {
  .dp__calendar_header {
    background-color: #f8f9fa;
    border-bottom: 1px solid var(--dp-border-color);
    padding: 0.5rem;
  }

  .dp__calendar_row {
    .dp__calendar_item {
      &:hover {
        background-color: var(--dp-hover-color);
      }

      &.dp__active_date {
        background-color: var(--dp-primary-color);
        color: var(--dp-primary-text-color);
      }

      &.dp__today {
        border: 1px solid var(--dp-primary-color);
      }
    }
  }
}

:deep(.dp-custom-time) {
  border-top: 1px solid var(--dp-border-color);
  padding: 0.5rem;
}

:deep(.dp__action_row) {
  border-top: 1px solid var(--dp-border-color);
  padding: 0.5rem;

  .dp__action_button {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid var(--dp-border-color);
    background-color: var(--dp-background-color);
    color: var(--dp-text-color);
    cursor: pointer;

    &:hover {
      background-color: var(--dp-hover-color);
    }

    &.dp__action_select {
      background-color: var(--dp-primary-color);
      color: var(--dp-primary-text-color);
      border-color: var(--dp-primary-color);
    }
  }
}

// Medical-specific styling
:deep(.dp__calendar_header_item) {
  font-weight: 500;
  color: var(--dp-text-color);
}

:deep(.dp__instance_calendar) {
  .dp__calendar_header_separator {
    display: none;
  }
}

// Responsive adjustments for medical tablets
@media (max-width: 768px) {
  :deep(.dp__menu) {
    max-width: 100vw;
    margin: 0 1rem;
  }

  .app-date {
    .date-container {
      .app-date__trigger {
        input {
          font-size: 16px; // Prevent zoom on iOS
        }
      }
    }
  }
}
</style>
