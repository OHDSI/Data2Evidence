import { describe, expect, it } from 'vitest'
import type { ResolvedWizardFieldGroup, WizardFieldDefinition } from '@/utils/dashboardFlowUtils'
import { validateRequiredFilters, type NumericValidationStatus } from '../requiredFiltersValidation'

const getText = (key: string, param?: string | string[]) => (param ? `${key}|${param}` : key)

const validateNumeric = (value: unknown, allowNegative: boolean): NumericValidationStatus => {
  const text = String(value)
  if (!/^-?\d+$/.test(text)) return 'invalid-format'
  if (!allowNegative && text.startsWith('-')) return 'negative-not-allowed'
  return 'valid'
}

const validate = (
  fields: WizardFieldDefinition[],
  formValues: Record<string, unknown>,
  groups: ResolvedWizardFieldGroup[] = []
) => validateRequiredFilters({ fields, formValues, groups, validateNumeric, getText })

describe('validateRequiredFilters', () => {
  describe('yearRange fields', () => {
    const field: WizardFieldDefinition = { id: 'years', label: 'Years', type: 'yearRange' }

    it('requires a required range', () => {
      expect(validate([field], { years_from: '', years_to: '' }).fieldErrors).toEqual({
        years: 'MRI_PA_FIELD_IS_REQUIRED|Years',
      })
    })

    it('accepts an empty optional range', () => {
      expect(validate([{ ...field, required: false }], { years_from: '', years_to: '' }).fieldErrors).toEqual({})
    })

    it('requires the to year when only the from year is set', () => {
      expect(validate([{ ...field, required: false }], { years_from: '2010', years_to: '' }).fieldErrors).toEqual({
        years: 'MRI_PA_TO_YEAR_REQUIRED',
      })
    })

    it('requires the from year when only the to year is set', () => {
      expect(validate([field], { years_from: '', years_to: '2010' }).fieldErrors).toEqual({
        years: 'MRI_PA_FROM_YEAR_REQUIRED',
      })
    })

    it('rejects a to year before the from year', () => {
      expect(validate([field], { years_from: '2015', years_to: '2010' }).fieldErrors).toEqual({
        years: 'MRI_PA_YEAR_RANGE_INVALID',
      })
    })

    it('accepts a valid range', () => {
      expect(validate([field], { years_from: '2010', years_to: '2010' }).fieldErrors).toEqual({})
    })

    it('marks both inputs of an empty required range as invalid', () => {
      expect(validate([field], { years_from: '', years_to: '' }).invalidInputIds).toEqual({
        years: ['years_from', 'years_to'],
      })
    })

    it('marks only the missing to year as invalid', () => {
      expect(validate([field], { years_from: '2010', years_to: '' }).invalidInputIds).toEqual({ years: ['years_to'] })
    })

    it('marks only the missing from year as invalid', () => {
      expect(validate([field], { years_from: '', years_to: '2010' }).invalidInputIds).toEqual({ years: ['years_from'] })
    })

    it('marks only the to year of a reversed range as invalid', () => {
      expect(validate([field], { years_from: '2015', years_to: '2010' }).invalidInputIds).toEqual({
        years: ['years_to'],
      })
    })
  })

  describe('numeric fields', () => {
    const field: WizardFieldDefinition = { id: 'age', label: 'Age', type: 'num' }

    it('requires a required value', () => {
      expect(validate([field], { age: '  ' }).fieldErrors).toEqual({ age: 'MRI_PA_FIELD_IS_REQUIRED|Age' })
      expect(validate([field], { age: '  ' }).invalidInputIds).toEqual({ age: ['age'] })
    })

    it('accepts an empty optional value', () => {
      expect(validate([{ ...field, required: false }], { age: '' }).fieldErrors).toEqual({})
    })

    it('rejects a negative value when negatives are not allowed', () => {
      expect(validate([field], { age: '-5' }).fieldErrors).toEqual({
        age: 'MRI_PA_NEGATIVE_VALUES_NOT_ALLOWED|Age',
      })
    })

    it('accepts a negative value when negatives are allowed', () => {
      expect(validate([{ ...field, allowNegative: true }], { age: '-5' }).fieldErrors).toEqual({})
    })

    it('rejects an invalid expression in an optional field', () => {
      expect(validate([{ ...field, required: false }], { age: 'abc' }).fieldErrors).toEqual({
        age: 'MRI_PA_NUMERIC_EXPRESSION_INVALID',
      })
    })
  })

  describe('date fields', () => {
    const field: WizardFieldDefinition = { id: 'visit', label: 'Visit', type: 'datetime' }

    it('requires at least one date', () => {
      expect(validate([field], { visit: { from: '', to: '' } }).fieldErrors).toEqual({
        visit: 'MRI_PA_FIELD_IS_REQUIRED|Visit',
      })
    })

    it('marks both date inputs as invalid', () => {
      expect(validate([field], { visit: { from: '', to: '' } }).invalidInputIds).toEqual({
        visit: ['visit_from', 'visit_to'],
      })
    })

    it('accepts a range with one date', () => {
      expect(validate([field], { visit: { from: '2020-01-01', to: '' } }).fieldErrors).toEqual({})
    })
  })

  describe('other fields', () => {
    const field: WizardFieldDefinition = { id: 'condition1', label: 'Condition', type: 'conceptSet' }

    it('requires a value', () => {
      expect(validate([field], { condition1: null }).fieldErrors).toEqual({
        condition1: 'MRI_PA_FIELD_IS_REQUIRED|Condition',
      })
      expect(validate([field], { condition1: '   ' }).fieldErrors).toEqual({
        condition1: 'MRI_PA_FIELD_IS_REQUIRED|Condition',
      })
    })

    it('accepts zero as a value', () => {
      expect(validate([field], { condition1: 0 }).fieldErrors).toEqual({})
    })

    it('accepts an empty optional field', () => {
      expect(validate([{ ...field, required: false }], { condition1: '' }).fieldErrors).toEqual({})
    })

    it('uses the field ID when the field has no label', () => {
      expect(validate([{ id: 'gender' }], {}).fieldErrors).toEqual({ gender: 'MRI_PA_FIELD_IS_REQUIRED|gender' })
    })
  })

  describe('field groups', () => {
    const height: WizardFieldDefinition = { id: 'height', label: 'Height', type: 'num', required: false }
    const weight: WizardFieldDefinition = { id: 'weight', label: 'Weight', type: 'num', required: false }
    const group: ResolvedWizardFieldGroup = {
      id: 'body',
      fieldIds: ['height', 'weight'],
      fields: [height, weight],
      validation: { minAnswered: 1, minMessage: 'Choose at least one measurement.' },
    }

    it('maps an invalid group to its message', () => {
      expect(validate([height, weight], { height: '', weight: '' }, [group]).groupErrors).toEqual({
        body: 'Choose at least one measurement.',
      })
    })

    it('returns no group error when the group is complete', () => {
      expect(validate([height, weight], { height: '170', weight: '' }, [group]).groupErrors).toEqual({})
    })
  })

  it('returns no errors for a valid form', () => {
    expect(
      validate(
        [
          { id: 'age', label: 'Age', type: 'num' },
          { id: 'condition1', label: 'Condition' },
        ],
        {
          age: '65',
          condition1: '1234',
        }
      )
    ).toEqual({ fieldErrors: {}, groupErrors: {}, invalidInputIds: {} })
  })
})
