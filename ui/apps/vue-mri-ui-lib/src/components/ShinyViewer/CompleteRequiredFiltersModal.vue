<template>
  <MessageBox v-if="isOpen" :busy="loading" messageType="custom" dialogWidth="700px" @close="handleCancel">
    <template #header>{{ getText('MRI_PA_REQUIRED_FILTERS_TITLE') }}</template>

    <template #body>
      <div class="required-filters-modal">
        <p class="description">
          {{ getText('MRI_PA_REQUIRED_FILTERS_DESC') }}
        </p>

        <p v-if="error" class="error-text">{{ error }}</p>

        <div v-for="field in allFields" :key="field.id" class="field-row">
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
                  @change="markFieldDirty(field.id)"
                />
                <span>to</span>
                <input
                  :id="`${field.id}_to`"
                  class="form-control"
                  type="date"
                  v-model="formValues[field.id].to"
                  @change="markFieldDirty(field.id)"
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
                  @blur="validateYearRange(field.id)"
                  @change="markFieldDirty(`${field.id}_from`)"
                >
                  <option value="">{{ getText('MRI_PA_YEAR_FROM_PLACEHOLDER') }}</option>
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
                  @blur="validateYearRange(field.id)"
                  @change="markFieldDirty(`${field.id}_to`)"
                >
                  <option value="">{{ getText('MRI_PA_YEAR_TO_PLACEHOLDER') }}</option>
                  <option v-for="year in yearOptions" :key="`to-${year}`" :value="String(year)">
                    {{ year }}
                  </option>
                </select>
              </div>
              <p v-if="yearErrors[field.id]" class="field-error">{{ yearErrors[field.id] }}</p>
            </template>

            <!-- Numeric input with operator support -->
            <template v-else-if="field.type === 'num'">
              <input
                :id="field.id"
                class="form-control"
                :class="{ 'is-invalid': numericErrors[field.id] }"
                type="text"
                :placeholder="field.placeholder || getText('MRI_PA_NUMERIC_INPUT_PLACEHOLDER')"
                v-model="formValues[field.id]"
                @input="onNumericInput(field.id)"
                @blur="validateNumericField(field.id, formValues[field.id])"
              />
              <p v-if="numericErrors[field.id]" class="field-error">{{ numericErrors[field.id] }}</p>
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
                  :display-value="displayValues[field.id]"
                  @update:model-value="
                    (val: string | null) => {
                      formValues[field.id] = val
                      handleDisplayValueChange(field.id, val)
                      markFieldDirty(field.id)
                    }
                  "
                />
                <!-- Condition field wildcard toggle - matches Wizards -->
                <div v-if="isConditionField(field.id) && formValues[field.id]" class="wildcard-toggle">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="formValues[`${field.id}_wildcard` as string]" />
                    <span>{{ getText('MRI_PA_INCLUDE_DESCENDANTS') }}</span>
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
                :placeholder="field.placeholder || getText('MRI_PA_SEARCH_PLACEHOLDER', field.label)"
                v-model="formValues[field.id]"
                @input="markFieldDirty(field.id)"
              />
            </template>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex-spacer"></div>
      <appButton
        :click="handleSubmit"
        :text="getText('MRI_PA_APPLY_FILTERS_BUTTON')"
        :disabled="loading || !isFormValid"
      />
      <appButton :click="handleCancel" :text="getText('MRI_PA_BUTTON_CANCEL')" :disabled="loading" />
    </template>
  </MessageBox>
</template>

<script lang="ts" setup>
import { computed, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import MessageBox from '../MessageBox.vue'
import appButton from '@/lib/ui/app-button.vue'
import ConceptSetTypeaheadField from './ConceptSetTypeaheadField.vue'
import type { WizardFieldDefinition } from '@/utils/dashboardFlowUtils'
import { isConditionField } from '@/utils/dashboardFlowUtils'
import InputParser from '@/lib/utils/InputParser'
import RangeConstraintTokenDefinition from '@/lib/utils/RangeConstraintTokenDefinition'
import RangeConstraintPatternDefinition from '@/lib/utils/RangeConstraintPatternDefinition'

const store = useStore()
const getText = (key: string, param?: string | string[]) => store.getters.getText(key, param)

const props = defineProps<{
  isOpen: boolean
  allFields: WizardFieldDefinition[]
  initialValues: Record<string, any>
  initialDisplayValues: Record<string, string>
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (
    e: 'submit',
    formValues: Record<string, any>,
    displayValues: Record<string, string>,
    dirtyFieldIds: Set<string>
  ): void
}>()

const formValues = reactive<Record<string, any>>({})
const displayValues = reactive<Record<string, string>>({})
const yearErrors = reactive<Record<string, string>>({})
const numericErrors = reactive<Record<string, string>>({})
const dirtyFields = reactive<Set<string>>(new Set())
const initialSnapshot = reactive<Record<string, any>>({})

// Initialize InputParser for numeric field validation
const numericParser = new InputParser(
  RangeConstraintTokenDefinition.tokenDefinitions,
  RangeConstraintPatternDefinition.acceptedPatterns
)

const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years: number[] = []
  for (let year = currentYear; year >= 1900; year--) {
    years.push(year)
  }
  return years
})

function normalizeInputValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return typeof value === 'string' ? value : String(value)
}

// Validate all fields and set error messages - call this before checking isFormValid
function validateAllFields(): boolean {
  // Clear year errors
  Object.keys(yearErrors).forEach(key => delete yearErrors[key])

  let isValid = true

  for (const field of props.allFields) {
    // yearRange validation - matches Wizards
    if (field.type === 'yearRange') {
      const from = formValues[`${field.id}_from`]
      const to = formValues[`${field.id}_to`]

      // If required, both must be filled
      if (field.required !== false) {
        if (!from || !to) {
          isValid = false
          continue
        }
      }

      // If either is set, both must be set
      if ((from && !to) || (!from && to)) {
        if (from && !to) {
          yearErrors[field.id] = getText('MRI_PA_TO_YEAR_REQUIRED')
        } else {
          yearErrors[field.id] = getText('MRI_PA_FROM_YEAR_REQUIRED')
        }
        isValid = false
        continue
      }

      // Validate range
      if (from && to) {
        const fromNum = Number(from)
        const toNum = Number(to)
        if (toNum < fromNum) {
          yearErrors[field.id] = getText('MRI_PA_YEAR_RANGE_INVALID')
          isValid = false
          continue
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
        isValid = false
      }
      continue
    }

    // Numeric types - validate if field has value
    if (field.type === 'num' && value) {
      if (!validateNumericValue(value)) {
        isValid = false
      }
      continue
    }

    // Other types - check for non-empty value
    const stringValue = typeof value === 'string' ? value.trim() : value
    if (!stringValue && stringValue !== 0) {
      isValid = false
    }
  }

  return isValid
}

// Check if all required fields are filled correctly (pure computed, no side effects)
const isFormValid = computed(() => {
  if (!props.allFields.length) {
    return true
  }

  for (const field of props.allFields) {
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
        return false
      }

      // Validate range
      if (from && to) {
        const fromNum = Number(from)
        const toNum = Number(to)
        if (toNum < fromNum) {
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

    // Numeric types - validate if field has value
    if (field.type === 'num' && value) {
      if (!validateNumericValue(value)) {
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
  () => [props.isOpen, props.allFields, props.initialValues],
  ([isOpen]) => {
    if (!isOpen) {
      return
    }

    // Clear all form values and tracking
    Object.keys(formValues).forEach(key => delete formValues[key])
    Object.keys(displayValues).forEach(key => delete displayValues[key])
    Object.keys(yearErrors).forEach(key => delete yearErrors[key])
    Object.keys(numericErrors).forEach(key => delete numericErrors[key])
    Object.keys(initialSnapshot).forEach(key => delete initialSnapshot[key])
    dirtyFields.clear()

    // Copy initial display values
    Object.assign(displayValues, props.initialDisplayValues)

    // Initialize each field from initialValues or with empty value
    props.allFields.forEach(field => {
      const initialValue = props.initialValues[field.id]

      if (isDateType(field.type)) {
        // Date range uses object structure
        formValues[field.id] = initialValue || { from: '', to: '' }
        initialSnapshot[field.id] = formValues[field.id]
      } else if (field.type === 'yearRange') {
        // Year range uses separate _from and _to fields
        const fromValue = normalizeInputValue(props.initialValues[`${field.id}_from`])
        const toValue = normalizeInputValue(props.initialValues[`${field.id}_to`])
        formValues[`${field.id}_from`] = String(fromValue)
        formValues[`${field.id}_to`] = String(toValue)
        initialSnapshot[`${field.id}_from`] = formValues[`${field.id}_from`]
        initialSnapshot[`${field.id}_to`] = formValues[`${field.id}_to`]
      } else if (field.type === 'num') {
        // Numeric fields are rendered/validated as text expressions in this modal.
        const normalizedValue = normalizeInputValue(initialValue)
        formValues[field.id] = String(normalizedValue)
        initialSnapshot[field.id] = formValues[field.id]
      } else {
        formValues[field.id] = initialValue !== undefined ? String(initialValue) : ''
        initialSnapshot[field.id] = formValues[field.id]
      }

      // Initialize wildcard for condition fields
      if (isConditionField(field.id)) {
        const wildcardValue = props.initialValues[`${field.id}_wildcard`]
        formValues[`${field.id}_wildcard`] = wildcardValue === true
        initialSnapshot[`${field.id}_wildcard`] = formValues[`${field.id}_wildcard`]
      }
    })
  },
  { immediate: true }
)

function isDateType(type?: string) {
  return type === 'time' || type === 'datetime' || type === 'date'
}

function shouldUseTypeahead(field: WizardFieldDefinition): boolean {
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

function markFieldDirty(fieldId: string) {
  const currentValue = formValues[fieldId]
  const initialValue = initialSnapshot[fieldId]

  // For yearRange, check both _from and _to
  if (fieldId.includes('_from') || fieldId.includes('_to')) {
    const baseId = fieldId.replace(/_(from|to)$/, '')
    const currentFrom = formValues[`${baseId}_from`]
    const currentTo = formValues[`${baseId}_to`]
    const initialFrom = initialSnapshot[`${baseId}_from`]
    const initialTo = initialSnapshot[`${baseId}_to`]

    const hasChanged = currentFrom !== initialFrom || currentTo !== initialTo

    if (hasChanged) {
      dirtyFields.add(baseId)
    } else {
      dirtyFields.delete(baseId)
    }
    return
  }

  // For regular fields
  const hasChanged = currentValue !== initialValue

  if (hasChanged) {
    dirtyFields.add(fieldId)
  } else {
    dirtyFields.delete(fieldId)
  }
}

function handleCancel() {
  emit('cancel')
}

function handleSubmit() {
  // Run validation to set error messages, then check if form is valid
  validateAllFields()
  if (!isFormValid.value) {
    return
  }

  // Build payload with all form values
  const payload: Record<string, any> = {}
  props.allFields.forEach(field => {
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

  emit('submit', payload, { ...displayValues }, new Set(dirtyFields))
}

/**
 * Validates a numeric expression value using the InputParser
 * @param value - The value to validate
 * @returns boolean indicating if the value is valid
 */
function validateNumericValue(value: unknown): boolean {
  const normalizedValue = normalizeInputValue(value).trim()

  if (!normalizedValue) {
    return true // Empty values are handled separately by required check
  }

  let isValid = true
  numericParser.parseInput(
    normalizedValue,
    () => {
      // Success callback - parsing succeeded
      isValid = true
    },
    () => {
      // Fail callback - parsing failed
      isValid = false
    }
  )
  return isValid
}

/**
 * Validates a numeric field and sets/clears error message
 * Called on input and blur events
 */
function validateNumericField(fieldId: string, value: unknown): void {
  const normalizedValue = normalizeInputValue(value).trim()

  if (!normalizedValue) {
    // Clear error if field is empty
    delete numericErrors[fieldId]
    return
  }

  const isValid = validateNumericValue(normalizedValue)
  if (isValid) {
    delete numericErrors[fieldId]
  } else {
    numericErrors[fieldId] = getText('MRI_PA_NUMERIC_EXPRESSION_INVALID')
  }
}

/**
 * Validates a numeric field on input
 * Called from template @input handler
 */
function onNumericInput(fieldId: string): void {
  validateNumericField(fieldId, formValues[fieldId])
  markFieldDirty(fieldId)
}

/**
 * Validates a year range field and sets/clears error message
 * Called on blur event from either year select
 */
function validateYearRange(fieldId: string): void {
  const from = formValues[`${fieldId}_from`]
  const to = formValues[`${fieldId}_to`]

  // Clear existing error
  delete yearErrors[fieldId]

  // Only validate if both values are present
  if (from && to) {
    const fromNum = Number(from)
    const toNum = Number(to)
    if (toNum < fromNum) {
      yearErrors[fieldId] = getText('MRI_PA_YEAR_RANGE_INVALID')
    }
  }
}
</script>

<style scoped>
.required-filters-modal {
  max-height: 520px;
  overflow: auto;
  padding-right: 8px;
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

.date-range-group > span,
.year-range-group > span {
  text-align: center;
  line-height: 1;
}

.year-range-group select {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  font-size: 0.8125rem;
  line-height: 32px;
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

.operator-help-text {
  margin-top: 2px;
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
