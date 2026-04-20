import { describe, expect, it, vi } from 'vitest'
import { getCardsFormatted } from '../bookmarkItems'

const toLocalYYYYMMDD = (input: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input
  }
  const date = new Date(input)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('bookmarkItems time formatting', () => {
  const mriFrontEndConfig = {
    getAttributeByPath: vi.fn((path: string) => {
      if (path.endsWith('startdate')) {
        return { oInternalConfigAttribute: { name: 'Condition Start Date' } }
      }
      return undefined
    }),
  } as any

  it('renders two nested time expressions as date range', () => {
    const startDate = '1986-12-21T16:00:00.000Z'
    const endDate = '1987-02-08T23:59:59.999Z'
    const boolContainers: any[] = [
      {
        content: [
          {
            configPath: 'patient.interactions.conditionoccurrence',
            instanceID: 'patient.interactions.conditionoccurrence.1',
            name: 'Condition Occurrence A',
            attributes: {
              content: [
                {
                  configPath: 'patient.interactions.conditionoccurrence.attributes.startdate',
                  constraints: {
                    content: [
                      {
                        content: [
                          { operator: '>=', value: startDate },
                          { operator: '<=', value: endDate },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    ]

    const expectedRange = `${toLocalYYYYMMDD(startDate)} - ${toLocalYYYYMMDD(endDate)}`
    const result = getCardsFormatted({
      boolContainers,
      getText: vi.fn(),
      getAttributeType: vi.fn(() => 'time'),
      getDomainValues: vi.fn(() => ({ values: [] })),
      mriFrontEndConfig,
    })

    expect(result[0].content[0].visibleAttributes[0].visibleConstraints).toStrictEqual([expectedRange])
  })

  it('renders single-sided time expressions with operator and YYYY-MM-DD', () => {
    const fromDate = '1999-01-01T00:00:00.000Z'
    const boolContainers: any[] = [
      {
        content: [
          {
            configPath: 'patient.interactions.conditionoccurrence',
            instanceID: 'patient.interactions.conditionoccurrence.1',
            name: 'Condition Occurrence A',
            attributes: {
              content: [
                {
                  configPath: 'patient.interactions.conditionoccurrence.attributes.startdate',
                  constraints: {
                    content: [
                      {
                        content: [{ operator: '>=', value: fromDate }],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    ]

    const result = getCardsFormatted({
      boolContainers,
      getText: vi.fn(),
      getAttributeType: vi.fn(() => 'time'),
      getDomainValues: vi.fn(() => ({ values: [] })),
      mriFrontEndConfig,
    })

    expect(result[0].content[0].visibleAttributes[0].visibleConstraints).toStrictEqual([
      `>=${toLocalYYYYMMDD(fromDate)}`,
    ])
  })

  it('renders two nested datetime expressions as YYYY-MM-DD HH:mm range', () => {
    const startDateTime = '1986-12-21T16:05:00.000Z'
    const endDateTime = '1987-02-08T23:59:59.999Z'
    const boolContainers: any[] = [
      {
        content: [
          {
            configPath: 'patient.interactions.conditionoccurrence',
            instanceID: 'patient.interactions.conditionoccurrence.1',
            name: 'Condition Occurrence A',
            attributes: {
              content: [
                {
                  configPath: 'patient.interactions.conditionoccurrence.attributes.startdatetime',
                  constraints: {
                    content: [
                      {
                        content: [
                          { operator: '>=', value: startDateTime },
                          { operator: '<=', value: endDateTime },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    ]

    const result = getCardsFormatted({
      boolContainers,
      getText: vi.fn(),
      getAttributeType: vi.fn(() => 'datetime'),
      getDomainValues: vi.fn(() => ({ values: [] })),
      mriFrontEndConfig,
    })

    expect(result[0].content[0].visibleAttributes[0].visibleConstraints).toStrictEqual([
      '1986-12-22 00:05 - 1987-02-09 07:59',
    ])
  })
})
