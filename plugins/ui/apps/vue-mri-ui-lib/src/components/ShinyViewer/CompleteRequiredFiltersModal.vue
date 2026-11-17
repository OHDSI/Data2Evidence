<template>
  <MessageBox v-if="isOpen" :busy="loading" messageType="custom" dialogWidth="700px" @close="handleCancel">
    <template #header>{{ getText('MRI_PA_REQUIRED_FILTERS_TITLE') }}</template>

    <template #body>
      <div class="required-filters-modal">
        <p class="description">
          {{ getText('MRI_PA_REQUIRED_FILTERS_DESC') }}
        </p>

        <p v-if="displayedFormNote" class="form-note">{{ displayedFormNote }}</p>

        <p v-if="error" class="error-text">{{ error }}</p>

        <section
          v-for="(section, sectionIndex) in displaySections"
          :key="section.id"
          class="form-section"
          :class="{ 'configured-section': section.configured, 'legacy-section': !section.configured }"
        >
          <h3 v-if="section.configured" class="section-title">
            <span class="section-number">{{ sectionIndex + 1 }}</span>
            {{ section.title }}
          </h3>
          <div class="section-content">
            <div v-for="group in section.groups" :id="getGroupElementId(group.id)" :key="group.id" class="form-group">
              <div v-if="group.label" class="group-header">
                <div class="group-title-row">
                  <h4 :aria-label="isGroupRequired(group) ? `${group.label}, required group` : undefined">
                    {{ group.label
                    }}<span v-if="isGroupRequired(group)" class="group-required-indicator" aria-hidden="true">*</span>
                  </h4>
                  <span v-if="getGroupCompletionHint(group)" class="info-tooltip">
                    <button
                      type="button"
                      class="info-button"
                      :aria-label="`${group.label} requirements`"
                      :aria-describedby="`${group.id}-requirements`"
                    >
                      i
                    </button>
                    <span :id="`${group.id}-requirements`" role="tooltip" class="info-tooltip-content">
                      {{ getGroupCompletionHint(group) }}
                    </span>
                  </span>
                </div>
              </div>
              <div class="field-grid" :class="getColumnsClass(group.columns)">
                <div v-for="field in group.fields" :key="field.id" class="field-row">
                  <div class="field-label-wrapper">
                    <label class="field-label" :for="field.id">
                      {{ field.label }}
                      <span v-if="field.required !== false" class="required-indicator">*</span>
                    </label>
                    <span v-if="field.type === 'num'" class="info-tooltip">
                      <button
                        type="button"
                        class="info-button"
                        :aria-label="`${field.label} valid formats`"
                        :aria-describedby="`${field.id}-numeric-help`"
                      >
                        i
                      </button>
                      <span :id="`${field.id}-numeric-help`" role="tooltip" class="info-tooltip-content">
                        <span>Valid format:</span>
                        <ul>
                          <li>Enter a single value</li>
                          <li>&gt; or &lt; for greater/less than</li>
                          <li>&gt;= or &lt;= for greater than or equal to/less than or equal to</li>
                          <li>[x-y] or ]x-y[ for an interval including or excluding the endpoints</li>
                          <li v-if="field.allowNegative === true">(-x) for negative values</li>
                        </ul>
                        <span>E.g: &gt;=60, [50-80]</span>
                      </span>
                    </span>
                  </div>

                  <div class="field-input-wrapper">
                    <!-- Date types -->
                    <template v-if="isDateFieldType(field.type)">
                      <div class="date-range-group">
                        <input
                          :id="`${field.id}_from`"
                          class="form-control"
                          :class="{ 'is-invalid': isInputInvalid(`${field.id}_from`) }"
                          type="date"
                          :aria-invalid="getAriaInvalid(`${field.id}_from`)"
                          :aria-describedby="getDescribedBy(group, field.id)"
                          v-model="formValues[field.id].from"
                          @change="markFieldDirty(field.id)"
                        />
                        <span>to</span>
                        <input
                          :id="`${field.id}_to`"
                          class="form-control"
                          :class="{ 'is-invalid': isInputInvalid(`${field.id}_to`) }"
                          type="date"
                          :aria-invalid="getAriaInvalid(`${field.id}_to`)"
                          :aria-describedby="getDescribedBy(group, field.id)"
                          v-model="formValues[field.id].to"
                          @change="markFieldDirty(field.id)"
                        />
                      </div>
                      <p v-if="fieldErrors[field.id]" :id="getErrorId(field.id)" class="field-error" role="alert">
                        {{ fieldErrors[field.id] }}
                      </p>
                    </template>

                    <!-- Year Range - matches Wizards implementation -->
                    <template v-else-if="field.type === 'yearRange'">
                      <div class="year-range-group">
                        <select
                          :id="`${field.id}_from`"
                          v-model="formValues[`${field.id}_from` as string]"
                          class="form-control"
                          :class="{ 'is-invalid': isInputInvalid(`${field.id}_from`) }"
                          :aria-invalid="getAriaInvalid(`${field.id}_from`)"
                          :aria-describedby="getDescribedBy(group, field.id)"
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
                          :class="{ 'is-invalid': isInputInvalid(`${field.id}_to`) }"
                          :aria-invalid="getAriaInvalid(`${field.id}_to`)"
                          :aria-describedby="getDescribedBy(group, field.id)"
                          @change="markFieldDirty(`${field.id}_to`)"
                        >
                          <option value="">{{ getText('MRI_PA_YEAR_TO_PLACEHOLDER') }}</option>
                          <option v-for="year in yearOptions" :key="`to-${year}`" :value="String(year)">
                            {{ year }}
                          </option>
                        </select>
                      </div>
                      <p v-if="fieldErrors[field.id]" :id="getErrorId(field.id)" class="field-error" role="alert">
                        {{ fieldErrors[field.id] }}
                      </p>
                    </template>

                    <!-- Numeric input with operator support -->
                    <template v-else-if="field.type === 'num'">
                      <div
                        class="numeric-input-anchor"
                        :tabindex="isFieldDisabled(group, field.id) ? 0 : undefined"
                        :aria-describedby="isFieldDisabled(group, field.id) ? `${field.id}-limit-help` : undefined"
                      >
                        <input
                          :id="field.id"
                          class="form-control"
                          :class="{ 'is-invalid': isInputInvalid(field.id) }"
                          type="text"
                          :placeholder="field.placeholder || getText('MRI_PA_NUMERIC_INPUT_PLACEHOLDER')"
                          :disabled="isFieldDisabled(group, field.id)"
                          :aria-invalid="getAriaInvalid(field.id)"
                          :aria-describedby="
                            getDescribedBy(
                              group,
                              field.id,
                              isFieldDisabled(group, field.id) ? `${field.id}-limit-help` : undefined
                            )
                          "
                          v-model="formValues[field.id]"
                          @input="markFieldDirty(field.id)"
                        />
                        <span
                          v-if="isFieldDisabled(group, field.id)"
                          :id="`${field.id}-limit-help`"
                          role="tooltip"
                          class="info-tooltip-content limit-tooltip-content"
                        >
                          <strong>{{ getGroupLimitTitle(group) }}</strong>
                          <span>{{ getGroupLimitBody(group) }}</span>
                        </span>
                      </div>
                      <p v-if="fieldErrors[field.id]" :id="getErrorId(field.id)" class="field-error" role="alert">
                        {{ fieldErrors[field.id] }}
                      </p>
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
                          :invalid="isInputInvalid(field.id)"
                          :described-by="getDescribedBy(group, field.id)"
                          @update:model-value="
                            (val: string | null) => {
                              formValues[field.id] = val
                              handleDisplayValueChange(field.id, val)
                              markFieldDirty(field.id)
                            }
                          "
                        />
                        <!-- Condition fields store includeDescendants, but the UI exposes an exclude opt-out. -->
                        <div
                          v-if="isConditionField(field.id) && formValues[field.id]"
                          class="include-descendants-toggle"
                        >
                          <label class="checkbox-label">
                            <input type="checkbox" v-model="formValues[`${field.id}_excludeDescendants` as string]" />
                            <span>{{ getText('MRI_PA_EXCLUDE_DESCENDANTS') }}</span>
                          </label>
                        </div>
                      </div>
                      <p v-if="fieldErrors[field.id]" :id="getErrorId(field.id)" class="field-error" role="alert">
                        {{ fieldErrors[field.id] }}
                      </p>
                    </template>

                    <!-- Plain text input -->
                    <template v-else>
                      <input
                        :id="field.id"
                        class="form-control"
                        :class="{ 'is-invalid': isInputInvalid(field.id) }"
                        type="text"
                        :placeholder="field.placeholder || getText('MRI_PA_SEARCH_PLACEHOLDER', field.label)"
                        :aria-invalid="getAriaInvalid(field.id)"
                        :aria-describedby="getDescribedBy(group, field.id)"
                        v-model="formValues[field.id]"
                        @input="markFieldDirty(field.id)"
                      />
                      <p v-if="fieldErrors[field.id]" :id="getErrorId(field.id)" class="field-error" role="alert">
                        {{ fieldErrors[field.id] }}
                      </p>
                    </template>
                  </div>
                </div>
              </div>
              <p v-if="groupErrors[group.id]" :id="getGroupErrorId(group.id)" class="field-error" role="alert">
                {{ groupErrors[group.id] }}
              </p>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <div class="flex-spacer"></div>
      <appButton :click="handleSubmit" :text="getText('MRI_PA_APPLY_FILTERS_BUTTON')" :disabled="loading" />
      <appButton :click="handleCancel" :text="getText('MRI_PA_BUTTON_CANCEL')" :disabled="loading" />
    </template>
  </MessageBox>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useStore } from 'vuex'
import MessageBox from '../MessageBox.vue'
import appButton from '@/lib/ui/app-button.vue'
import ConceptSetTypeaheadField from './ConceptSetTypeaheadField.vue'
import type {
  ResolvedWizardFieldGroup,
  ResolvedWizardFormSection,
  WizardFieldDefinition,
  WizardFormSection,
} from '@/utils/dashboardFlowUtils'
import {
  getWizardGroupCompletionHint,
  isWizardFieldDisabledByGroupLimit,
  isConditionField,
  numericFilterContainsNegativeValue,
  normalizeWizardFieldValueForComparison,
  resolveWizardFormLayout,
} from '@/utils/dashboardFlowUtils'
import InputParser from '@/lib/utils/InputParser'
import RangeConstraintTokenDefinition from '@/lib/utils/RangeConstraintTokenDefinition'
import RangeConstraintPatternDefinition from '@/lib/utils/RangeConstraintPatternDefinition'
import { isDateFieldType, validateRequiredFilters, type NumericValidationStatus } from './requiredFiltersValidation'

const store = useStore()
const getText = (key: string, param?: string | string[]) => store.getters.getText(key, param)

const props = defineProps<{
  isOpen: boolean
  allFields: WizardFieldDefinition[]
  sections?: WizardFormSection[]
  formNote?: string | null
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
const submitAttempted = ref(false)
const dirtyFields = reactive<Set<string>>(new Set())
const initialSnapshot = reactive<Record<string, any>>({})

interface DisplayWizardSection extends ResolvedWizardFormSection {
  configured: boolean
}

const resolvedLayout = computed(() => resolveWizardFormLayout(props.allFields, props.sections))
const displayedFormNote = computed(() => props.formNote?.trim() || null)
const displaySections = computed<DisplayWizardSection[]>(() => {
  if (resolvedLayout.value.sections.length === 0) {
    return [
      {
        id: 'legacy',
        title: '',
        configured: false,
        groups: [
          {
            id: 'legacy-fields',
            fieldIds: props.allFields.map(field => field.id),
            columns: 1,
            fields: props.allFields,
          },
        ],
      },
    ]
  }

  const sections = resolvedLayout.value.sections.map(section => ({ ...section, configured: true }))
  if (resolvedLayout.value.ungroupedFields.length > 0) {
    sections.push({
      id: 'additional',
      title: 'Additional',
      configured: true,
      groups: [
        {
          id: 'additional-fields',
          fieldIds: resolvedLayout.value.ungroupedFields.map(field => field.id),
          columns: 2,
          fields: resolvedLayout.value.ungroupedFields,
        },
      ],
    })
  }
  return sections
})

function getColumnsClass(columns: number = 2): string {
  return `columns-${columns}`
}

function isGroupRequired(group: ResolvedWizardFieldGroup): boolean {
  return (group.validation?.minAnswered ?? 0) > 0
}

function getGroupCompletionHint(group: ResolvedWizardFieldGroup): string | null {
  return getWizardGroupCompletionHint(group)
}

function isFieldDisabled(group: ResolvedWizardFieldGroup, fieldId: string): boolean {
  return isWizardFieldDisabledByGroupLimit(group, fieldId, formValues)
}

function getGroupLimitTitle(group: ResolvedWizardFieldGroup): string {
  const fieldCount = group.fields.length === 3 ? 'three' : String(group.fields.length)
  return `Only ${group.validation?.maxAnswered} of the ${fieldCount} fields`
}

function getGroupLimitBody(group: ResolvedWizardFieldGroup): string {
  return `(${group.fields.map(field => field.label || field.id).join(', ')}) can be filled in at the same time.`
}

const validation = computed(() =>
  validateRequiredFilters({
    fields: props.allFields,
    formValues,
    groups: resolvedLayout.value.sections.flatMap(section => section.groups),
    validateNumeric: validateNumericValue,
    getText,
  })
)
const isFormValid = computed(
  () => Object.keys(validation.value.fieldErrors).length === 0 && Object.keys(validation.value.groupErrors).length === 0
)
const fieldErrors = computed<Record<string, string>>(() => (submitAttempted.value ? validation.value.fieldErrors : {}))
const groupErrors = computed<Record<string, string>>(() => (submitAttempted.value ? validation.value.groupErrors : {}))
const invalidInputIds = computed(
  () => new Set(submitAttempted.value ? Object.values(validation.value.invalidInputIds).flat() : [])
)

function getGroupElementId(groupId: string): string {
  return `required-filters-group-${groupId}`
}

function getErrorId(fieldId: string): string {
  return `${fieldId}-error`
}

function getGroupErrorId(groupId: string): string {
  return `${getGroupElementId(groupId)}-error`
}

function isInputInvalid(inputId: string): boolean {
  return invalidInputIds.value.has(inputId)
}

function getAriaInvalid(inputId: string): 'true' | undefined {
  return isInputInvalid(inputId) ? 'true' : undefined
}

function getDescribedBy(group: ResolvedWizardFieldGroup, fieldId: string, extraId?: string): string | undefined {
  const ids = [
    fieldErrors.value[fieldId] ? getErrorId(fieldId) : undefined,
    groupErrors.value[group.id] ? getGroupErrorId(group.id) : undefined,
    extraId,
  ].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

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
    Object.keys(initialSnapshot).forEach(key => delete initialSnapshot[key])
    dirtyFields.clear()
    submitAttempted.value = false

    // Copy initial display values
    Object.assign(displayValues, props.initialDisplayValues)

    // Initialize each field from initialValues or with empty value
    props.allFields.forEach(field => {
      const initialValue = props.initialValues[field.id]

      if (isDateFieldType(field.type)) {
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

      // Initialize excludeDescendants for condition fields
      if (isConditionField(field.id)) {
        const includeDescendantsValue = props.initialValues[`${field.id}_includeDescendants`]
        formValues[`${field.id}_excludeDescendants`] =
          includeDescendantsValue === undefined
            ? field.excludeDescendantsByDefault === true
            : includeDescendantsValue !== true
        initialSnapshot[`${field.id}_excludeDescendants`] = formValues[`${field.id}_excludeDescendants`]
      }
    })
  },
  { immediate: true }
)

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
  const hasChanged =
    normalizeWizardFieldValueForComparison(currentValue) !== normalizeWizardFieldValueForComparison(initialValue)

  if (hasChanged) {
    dirtyFields.add(fieldId)
  } else {
    dirtyFields.delete(fieldId)
  }
}

function handleCancel() {
  emit('cancel')
}

function getFirstInvalidElement(): HTMLElement | null {
  for (const section of displaySections.value) {
    for (const group of section.groups) {
      const invalidField = group.fields.find(field => fieldErrors.value[field.id])
      if (invalidField) {
        const [firstInputId] = validation.value.invalidInputIds[invalidField.id] ?? [invalidField.id]
        return document.getElementById(firstInputId)
      }
      if (groupErrors.value[group.id]) {
        return (
          document
            .getElementById(getGroupElementId(group.id))
            ?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled)') ?? null
        )
      }
    }
  }
  return null
}

async function handleSubmit() {
  submitAttempted.value = true
  if (!isFormValid.value) {
    await nextTick()
    getFirstInvalidElement()?.focus()
    return
  }

  // Build payload with all form values
  const payload: Record<string, any> = {}
  props.allFields.forEach(field => {
    if (field.type === 'yearRange') {
      // yearRange: include _from and _to values
      payload[`${field.id}_from`] = formValues[`${field.id}_from`]
      payload[`${field.id}_to`] = formValues[`${field.id}_to`]
    } else if (isDateFieldType(field.type)) {
      // Date range: keep object structure
      payload[field.id] = formValues[field.id]
    } else {
      payload[field.id] = formValues[field.id]
    }

    // Include includeDescendants for condition fields
    if (isConditionField(field.id)) {
      payload[`${field.id}_includeDescendants`] = formValues[`${field.id}_excludeDescendants`] !== true
    }
  })

  emit('submit', payload, { ...displayValues }, new Set(dirtyFields))
}

/**
 * Validates a numeric expression value using the InputParser
 * @param value - The value to validate
 * @param allowNegative - Whether parsed negative operands are accepted
 * @returns syntax and sign-policy validation status
 */
function validateNumericValue(value: unknown, allowNegative: boolean): NumericValidationStatus {
  const normalizedValue = normalizeInputValue(value).trim()

  if (!normalizedValue) {
    return 'valid' // Empty values are handled separately by required check
  }

  let hasInvalidFormat = false
  let hasNegativeValue = false
  numericParser.parseInput(
    normalizedValue,
    (_inputPart: string, parsedValue: unknown) => {
      hasNegativeValue ||= numericFilterContainsNegativeValue(parsedValue)
    },
    () => {
      hasInvalidFormat = true
    }
  )

  if (hasInvalidFormat) return 'invalid-format'
  if (!allowNegative && hasNegativeValue) return 'negative-not-allowed'
  return 'valid'
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

.form-note {
  margin: -4px 0 14px;
  color: #333;
  font-style: italic;
  line-height: 1.45;
}

.error-text {
  color: var(--color-feedback-error, #a3293d);
  margin-bottom: 12px;
}

.form-section {
  overflow: visible;
  margin-bottom: 16px;
  border: 1px solid #dfe5ef;
  border-radius: 6px;
  background: #fff;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 9px 12px;
  background: #eaf3ff;
  border-radius: 5px 5px 0 0;
  color: var(--color-mri-brand, #000080);
  font-size: 0.875rem;
  font-weight: 600;
}

.section-number {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #d8e8ff;
  font-size: 0.75rem;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 5px;
}

.group-header h4 {
  margin: 0;
  color: #4b5563;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.group-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.group-required-indicator {
  margin-left: 2px;
  color: var(--color-feedback-error, #a3293d);
}

.field-grid {
  display: grid;
  gap: 12px;
}

.field-grid.columns-1 {
  grid-template-columns: minmax(0, 1fr);
}

.field-grid.columns-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-grid.columns-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.configured-section .field-row {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 0;
}

.configured-section .field-label-wrapper {
  padding-top: 0;
}

.legacy-section {
  overflow: visible;
  margin-bottom: 0;
  border: 0;
  border-radius: 0;
}

.legacy-section .section-content {
  gap: 0;
  padding: 0;
}

.legacy-section .field-grid {
  display: block;
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

.info-tooltip {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
}

.info-button {
  display: inline-flex;
  width: 15px;
  height: 15px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #7b8492;
  border-radius: 50%;
  background: #fff;
  color: #606975;
  cursor: help;
  font-family: serif;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.info-button:focus-visible {
  outline: 2px solid var(--color-mri-brand, #000080);
  outline-offset: 2px;
}

.info-tooltip-content {
  position: absolute;
  top: calc(100% + 9px);
  left: 50%;
  z-index: 30;
  display: none;
  width: max-content;
  max-width: 300px;
  padding: 12px 14px;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(0, 0, 0, 0.2);
  color: #555;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.45;
  transform: translateX(-18px);
}

.info-tooltip-content::before {
  position: absolute;
  top: -6px;
  left: 12px;
  width: 12px;
  height: 12px;
  background: #fff;
  content: '';
  transform: rotate(45deg);
}

.field-grid.columns-3 .field-row:nth-child(3n) .info-tooltip-content {
  right: 0;
  left: auto;
  transform: none;
}

.field-grid.columns-3 .field-row:nth-child(3n) .info-tooltip-content::before {
  right: 12px;
  left: auto;
}

.info-tooltip-content ul {
  margin: 4px 0 10px;
  padding-left: 20px;
}

.info-tooltip-content strong {
  display: block;
  margin-bottom: 2px;
  color: var(--color-mri-brand, #000080);
}

.info-tooltip:hover .info-tooltip-content,
.info-tooltip:focus-within .info-tooltip-content {
  display: block;
}

.numeric-input-anchor {
  position: relative;
  width: 100%;
}

.numeric-input-anchor .form-control {
  width: 100%;
}

.numeric-input-anchor:focus-visible {
  outline: 2px solid var(--color-mri-brand, #000080);
  outline-offset: 2px;
}

.numeric-input-anchor:hover .limit-tooltip-content,
.numeric-input-anchor:focus-within .limit-tooltip-content {
  display: block;
}

.field-label {
  margin: 0;
  font-weight: 500;
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

.form-control:disabled {
  border-color: #e1e3e6;
  background: #f6f6f6;
  color: #a0a4aa;
  cursor: not-allowed;
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

.include-descendants-toggle {
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
  .field-grid.columns-2,
  .field-grid.columns-3 {
    grid-template-columns: minmax(0, 1fr);
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .field-label-wrapper {
    padding-top: 0;
  }
}
</style>
