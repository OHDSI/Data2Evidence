<template>
  <MessageBox v-if="isOpen" :busy="loading" messageType="custom" dialogWidth="700px" @close="handleCancel">
    <template #header>Complete Required Filters</template>

    <template #body>
      <div class="required-filters-modal">
        <p class="description">
          Fill in the required dashboard fields that are not present in the current MRI filters.
        </p>

        <p v-if="error" class="error-text">{{ error }}</p>

        <div v-for="field in fields" :key="field.id" class="field-row">
          <div class="field-label-wrapper">
            <label class="field-label" :for="field.id">
              {{ field.label }}
              <span v-if="field.required !== false" class="required-indicator">*</span>
            </label>
          </div>

          <div class="field-input-wrapper">
            <!-- Date types -->
            <template v-if="isDateType(field.type)">
              <div class="date-range-group">
                <input
                  :id="`${field.id}_from`"
                  class="form-control"
                  type="date"
                  v-model="formValues[field.id].from"
                />
                <span>to</span>
                <input
                  :id="`${field.id}_to`"
                  class="form-control"
                  type="date"
                  v-model="formValues[field.id].to"
                />
              </div>
            </template>

            <!-- Year Range - matches Wizards implementation -->
            <template v-else-if="field.type === 'yearRange'">
              <div class="year-range-group">
                <select
                  :id="`${field.id}_from`"
                  v-model="formValues[`${field.id}_from` as string]"
                  class="form-control"
                  :class="{ 'is-invalid': yearErrors[field.id] }"
                >
                  <option value="">From year</option>
                  <option v-for="year in yearOptions" :key="`from-${year}`" :value="String(year)">
                    {{ year }}
                  </option>
                </select>
                <span>-</span>
                <select
                  :id="`${field.id}_to`"
                  v-model="formValues[`${field.id}_to` as string]"
                  class="form-control"
                  :class="{ 'is-invalid': yearErrors[field.id] }"
                >
                  <option value="">To year</option>
                  <option v-for="year in yearOptions" :key="`to-${year}`" :value="String(year)">
                    {{ year }}
                  </option>
                </select>
              </div>
              <p v-if="yearErrors[field.id]" class="field-error">{{ yearErrors[field.id] }}</p>
            </template>

            <!-- Numeric input -->
            <template v-else-if="field.type === 'num'">
              <input
                :id="field.id"
                class="form-control"
                type="text"
                :placeholder="field.placeholder || 'e.g. >=65, [50-80], 72'"
                v-model="formValues[field.id]"
              />
            </template>

            <!-- Typeahead for conceptSet or text with configPath -->
            <template v-else-if="shouldUseTypeahead(field)">
              <div class="typeahead-wrapper">
                <ConceptSetTypeaheadField
                  :field-id="field.id"
                  :label="field.label || field.id"
                  :config-path="field.configPath!"
                  :required="field.required !== false"
                  :allow-free-text="field.allowFreeText"
                  :placeholder="field.placeholder"
                  :model-value="formValues[field.id]"
                  @update:model-value="(val: string | null) => { formValues[field.id] = val; handleDisplayValueChange(field.id, val) }"
                />
                <!-- Condition field wildcard toggle - matches Wizards -->
                <div v-if="isConditionField(field.id) && formValues[field.id]" class="wildcard-toggle">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      v-model="formValues[`${field.id}_wildcard` as string]"
                    />
                    <span>Include descendants</span>
                  </label>
                </div>
              </div>
            </template>

            <!-- Plain text input -->
            <template v-else>
              <input
                :id="field.id"
                class="form-control"
                type="text"
                :placeholder="field.placeholder || `Enter ${field.label}`"
                v-model="formValues[field.id]"
              />
            </template>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex-spacer"></div>
      <appButton :click="handleSubmit" text="Apply Filters" :disabled="loading || !isFormValid" />
      <appButton :click="handleCancel" text="Cancel" :disabled="loading" />
    </template>
  </MessageBox>
</template>

<script lang="ts" setup>
import { computed, reactive, watch } from 'vue'
import MessageBox from '../MessageBox.vue'
import appButton from '@/lib/ui/app-button.vue'
import ConceptSetTypeaheadField from './ConceptSetTypeaheadField.vue'
import type { WizardFieldDefinition, MissingRequiredField } from '@/utils/dashboardFlowUtils'
import { isConditionField } from '@/utils/dashboardFlowUtils'

export interface RequiredFieldItem extends WizardFieldDefinition {}

const props = defineProps<{
  isOpen: boolean
  fields: MissingRequiredField[]
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'submit', formValues: Record<string, any>, displayValues: Record<string, string>): void
}>()

const formValues = reactive<Record<string, any>>({})
const displayValues = reactive<Record<string, string>>({})
const yearErrors = reactive<Record<string, string>>({})

const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years: number[] = []
  for (let year = currentYear; year >= 1900; year--) {
    years.push(year)
  }
  return years
})

// Check if all required fields are filled correctly
const isFormValid = computed(() => {
  if (!props.fields.length) {
    return true
  }

  // Clear year errors
  Object.keys(yearErrors).forEach((key) => delete yearErrors[key])

  for (const field of props.fields) {
    // yearRange validation - matches Wizards
    if (field.type === 'yearRange') {
      const from = formValues[`${field.id}_from`]
      const to = formValues[`${field.id}_to`]

      // If required, both must be filled
      if (field.required !== false) {
        if (!from || !to) {
          return false
        }
      }

      // If either is set, both must be set
      if ((from && !to) || (!from && to)) {
        if (from && !to) {
          yearErrors[field.id] = 'To year is required'
        } else {
          yearErrors[field.id] = 'From year is required'
        }
        return false
      }

      // Validate range
      if (from && to) {
        const fromNum = Number(from)
        const toNum = Number(to)
        if (toNum < fromNum) {
          yearErrors[field.id] = 'To year must be greater than or equal to from year'
          return false
        }
      }
      continue
    }

    // Skip validation for non-required fields
    if (field.required === false) {
      continue
    }

    const value = formValues[field.id]

    // Date types
    if (isDateType(field.type)) {
      if (!value || (!value.from && !value.to)) {
        return false
      }
      continue
    }

    // Other types - check for non-empty value
    const stringValue = typeof value === 'string' ? value.trim() : value
    if (!stringValue && stringValue !== 0) {
      return false
    }
  }

  return true
})

// Initialize form values when modal opens
watch(
  () => [props.isOpen, props.fields],
  ([isOpen]) => {
    if (!isOpen) {
      return
    }

    // Clear all form values
    Object.keys(formValues).forEach((key) => delete formValues[key])
    Object.keys(displayValues).forEach((key) => delete displayValues[key])
    Object.keys(yearErrors).forEach((key) => delete yearErrors[key])

    // Initialize each field
    props.fields.forEach((field) => {
      if (isDateType(field.type)) {
        // Date range uses object structure
        formValues[field.id] = { from: '', to: '' }
      } else if (field.type === 'yearRange') {
        // Year range uses separate _from and _to fields
        formValues[`${field.id}_from`] = ''
        formValues[`${field.id}_to`] = ''
      } else {
        formValues[field.id] = ''
      }

      // Initialize wildcard for condition fields
      if (isConditionField(field.id)) {
        formValues[`${field.id}_wildcard`] = false
      }
    })
  },
  { immediate: true }
)

function isDateType(type?: string) {
  return type === 'time' || type === 'datetime' || type === 'date'
}

function shouldUseTypeahead(field: MissingRequiredField): boolean {
  if (field.type === 'conceptSet') {
    return true
  }
  if (field.type === 'text' && field.configPath) {
    return true
  }
  return false
}

function handleDisplayValueChange(fieldId: string, displayValue: string | null) {
  if (displayValue) {
    displayValues[fieldId] = displayValue
  } else {
    delete displayValues[fieldId]
  }
}

function handleCancel() {
  emit('cancel')
}

function handleSubmit() {
  if (!isFormValid.value) {
    return
  }

  // Build payload with all form values
  const payload: Record<string, any> = {}
  props.fields.forEach((field) => {
    if (field.type === 'yearRange') {
      // yearRange: include _from and _to values
      payload[`${field.id}_from`] = formValues[`${field.id}_from`]
      payload[`${field.id}_to`] = formValues[`${field.id}_to`]
    } else if (isDateType(field.type)) {
      // Date range: keep object structure
      payload[field.id] = formValues[field.id]
    } else {
      payload[field.id] = formValues[field.id]
    }

    // Include wildcard for condition fields
    if (isConditionField(field.id)) {
      payload[`${field.id}_wildcard`] = formValues[`${field.id}_wildcard`] || false
    }
  })

  emit('submit', payload, { ...displayValues })
}
</script>

<style scoped>
.required-filters-modal {
  max-height: 420px;
  overflow: auto;
}

.description {
  margin-bottom: 14px;
}

.error-text {
  color: var(--color-feedback-error, #a3293d);
  margin-bottom: 12px;
}

.field-row {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
  margin-bottom: 14px;
  align-items: start;
}

.field-label-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 6px;
}

.field-label {
  margin: 0;
  font-weight: 600;
}

.required-indicator {
  color: var(--color-feedback-error, #a3293d);
}

.field-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-range-group,
.year-range-group {
  display: grid;
  grid-template-columns: 1fr 24px 1fr;
  gap: 8px;
  align-items: center;
}

.year-range-group select {
  width: 100%;
}

.form-control.is-invalid {
  border-color: var(--color-feedback-error, #a3293d);
}

.field-error {
  color: var(--color-feedback-error, #a3293d);
  font-size: 0.875rem;
  margin: 0;
}

.typeahead-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wildcard-toggle {
  margin-top: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #495057;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  margin: 0;
}

.flex-spacer {
  flex: 1;
}

@media (max-width: 720px) {
  .field-row {
    grid-template-columns: 1fr;
  }

  .field-label-wrapper {
    padding-top: 0;
  }
}
</style>
