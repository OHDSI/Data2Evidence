import type { ResolvedWizardFieldGroup, WizardFieldDefinition } from '@/utils/dashboardFlowUtils'
import { getWizardGroupValidationMessage } from '@/utils/dashboardFlowUtils'

export type NumericValidationStatus = 'valid' | 'invalid-format' | 'negative-not-allowed'

export interface RequiredFiltersValidationInput {
  fields: WizardFieldDefinition[]
  formValues: Record<string, any>
  groups: ResolvedWizardFieldGroup[]
  validateNumeric: (value: unknown, allowNegative: boolean) => NumericValidationStatus
  getText: (key: string, param?: string | string[]) => string
}

export interface RequiredFiltersValidationResult {
  fieldErrors: Record<string, string>
  groupErrors: Record<string, string>
}

export function isDateFieldType(type?: string): boolean {
  return type === 'time' || type === 'datetime' || type === 'date'
}

function hasText(value: unknown): boolean {
  if (value === null || value === undefined) return false
  return String(value).trim().length > 0
}

function getFieldError(field: WizardFieldDefinition, input: RequiredFiltersValidationInput): string | null {
  const { formValues, getText, validateNumeric } = input
  const required = field.required !== false
  const requiredMessage = getText('MRI_PA_FIELD_IS_REQUIRED', field.label || field.id)

  if (field.type === 'yearRange') {
    const hasFrom = hasText(formValues[`${field.id}_from`])
    const hasTo = hasText(formValues[`${field.id}_to`])
    if (!hasFrom && !hasTo) return required ? requiredMessage : null
    if (!hasTo) return getText('MRI_PA_TO_YEAR_REQUIRED')
    if (!hasFrom) return getText('MRI_PA_FROM_YEAR_REQUIRED')
    if (Number(formValues[`${field.id}_to`]) < Number(formValues[`${field.id}_from`])) {
      return getText('MRI_PA_YEAR_RANGE_INVALID')
    }
    return null
  }

  const value = formValues[field.id]

  if (field.type === 'num') {
    if (!hasText(value)) return required ? requiredMessage : null
    const status = validateNumeric(value, field.allowNegative === true)
    if (status === 'negative-not-allowed') {
      return getText('MRI_PA_NEGATIVE_VALUES_NOT_ALLOWED', field.label || field.id)
    }
    if (status === 'invalid-format') return getText('MRI_PA_NUMERIC_EXPRESSION_INVALID')
    return null
  }

  if (!required) return null

  if (isDateFieldType(field.type)) {
    return hasText(value?.from) || hasText(value?.to) ? null : requiredMessage
  }

  return hasText(value) ? null : requiredMessage
}

export function validateRequiredFilters(input: RequiredFiltersValidationInput): RequiredFiltersValidationResult {
  const fieldErrors = Object.fromEntries(
    input.fields.flatMap(field => {
      const message = getFieldError(field, input)
      return message ? [[field.id, message]] : []
    })
  )
  const groupErrors = Object.fromEntries(
    input.groups.flatMap(group => {
      const message = getWizardGroupValidationMessage(group, input.formValues)
      return message ? [[group.id, message]] : []
    })
  )

  return { fieldErrors, groupErrors }
}
