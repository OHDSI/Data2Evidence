import { describe, expect, it } from 'vitest'
import { parseNumericInput, validateRequiredFields } from '../dashboardFlowUtils'

const createExpression = (operator: string, value: string | number) => ({
  type: 'Expression' as const,
  operator,
  value,
})

const createAttribute = (configPath: string, expressions: Array<{ operator: string; value: string | number }>) => ({
  type: 'Attribute' as const,
  configPath,
  constraints: {
    type: 'BooleanContainer' as const,
    op: 'OR' as const,
    content: expressions.map(exp => createExpression(exp.operator, exp.value)),
  },
})

const createFilterCard = (configPath: string, attributes: any[]) => ({
  type: 'FilterCard' as const,
  configPath,
  attributes: {
    type: 'BooleanContainer' as const,
    op: 'AND' as const,
    content: attributes,
  },
})

describe('validateRequiredFields', () => {
  it('marks field as missing when no matching filter card path exists', () => {
    const wizard = {
      id: 'demo-dashboard',
      fields: [
        {
          id: 'age',
          label: 'Age',
          required: true,
          type: 'num',
          configPath: 'patient.attributes.Age',
        },
      ],
    }

    const cards = {
      type: 'BooleanContainer' as const,
      op: 'AND' as const,
      content: [],
    }

    const result = validateRequiredFields(wizard, cards)

    expect(result.missingFields).toHaveLength(1)
    expect(result.missingFields[0].reason).toBe('NO_MATCHING_CARD')
  })

  it('marks field as missing when fixed attributes do not match in same card', () => {
    const wizard = {
      id: 'demo-dashboard',
      fields: [
        {
          id: 'weight',
          label: 'Weight',
          required: true,
          type: 'num',
          configPath: 'patient.interactions.measurement.attributes.numval',
          filterCardPath: 'patient.interactions.measurement',
          fixedAttributes: [
            {
              configPath: 'patient.interactions.measurement.attributes.meas_concept_name',
              operator: '=',
              value: 'Body Weight',
            },
          ],
        },
      ],
    }

    const cards = {
      type: 'BooleanContainer' as const,
      op: 'AND' as const,
      content: [
        createFilterCard('patient.interactions.measurement', [
          createAttribute('patient.interactions.measurement.attributes.meas_concept_name', [
            { operator: '=', value: 'Body Height' },
          ]),
          createAttribute('patient.interactions.measurement.attributes.numval', [{ operator: '>=', value: 50 }]),
        ]),
      ],
    }

    const result = validateRequiredFields(wizard, cards)

    expect(result.missingFields).toHaveLength(1)
    expect(result.missingFields[0].reason).toBe('MISSING_FIXED_ATTRIBUTES')
  })

  it('treats field as satisfied when fixed attributes and value are present', () => {
    const wizard = {
      id: 'demo-dashboard',
      fields: [
        {
          id: 'weight',
          label: 'Weight',
          required: true,
          type: 'num',
          configPath: 'patient.interactions.measurement.attributes.numval',
          filterCardPath: 'patient.interactions.measurement',
          fixedAttributes: [
            {
              configPath: 'patient.interactions.measurement.attributes.meas_concept_name',
              operator: '=',
              value: 'Body Weight',
            },
          ],
        },
      ],
    }

    const cards = {
      type: 'BooleanContainer' as const,
      op: 'AND' as const,
      content: [
        createFilterCard('patient.interactions.measurement', [
          createAttribute('patient.interactions.measurement.attributes.meas_concept_name', [
            { operator: '=', value: 'Body Weight' },
          ]),
          createAttribute('patient.interactions.measurement.attributes.numval', [{ operator: '>=', value: 50 }]),
        ]),
      ],
    }

    const result = validateRequiredFields(wizard, cards)

    expect(result.missingFields).toHaveLength(0)
    expect(result.breakdown[0].satisfied).toBe(true)
  })

  it('marks field as empty constraint when attribute exists without expressions', () => {
    const wizard = {
      id: 'demo-dashboard',
      fields: [
        {
          id: 'gender',
          label: 'Gender',
          required: true,
          type: 'text',
          configPath: 'patient.attributes.Gender_concept_name',
        },
      ],
    }

    const cards = {
      type: 'BooleanContainer' as const,
      op: 'AND' as const,
      content: [
        createFilterCard('patient', [
          {
            type: 'Attribute' as const,
            configPath: 'patient.attributes.Gender_concept_name',
            constraints: {
              type: 'BooleanContainer' as const,
              op: 'OR' as const,
              content: [],
            },
          },
        ]),
      ],
    }

    const result = validateRequiredFields(wizard, cards)

    expect(result.missingFields).toHaveLength(1)
    expect(result.missingFields[0].reason).toBe('EMPTY_CONSTRAINT')
  })
})

describe('parseNumericInput', () => {
  it('parses operator-based input', () => {
    expect(parseNumericInput('>=65')).toEqual([{ op: '>=', value: 65 }])
  })

  it('parses inclusive range input', () => {
    expect(parseNumericInput('[50-80]')).toEqual([{ and: [{ op: '>=', value: 50 }, { op: '<=', value: 80 }] }])
  })

  it('parses comma separated expressions', () => {
    expect(parseNumericInput('>50,<=70')).toEqual([
      { op: '>', value: 50 },
      { op: '<=', value: 70 },
    ])
  })

  it('returns empty array for invalid input', () => {
    expect(parseNumericInput('abc')).toEqual([])
  })
})
