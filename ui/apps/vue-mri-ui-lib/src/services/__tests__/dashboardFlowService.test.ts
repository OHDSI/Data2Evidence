import { describe, it, expect } from 'vitest'
import {
  getConstraintExpressions,
  constraintContainsExpression,
  cardMatchesFixedAttributes,
  findFilterCardIdForField,
  type Constraint,
  type FilterCard,
} from '../dashboardFlowService'

describe('dashboardFlowService', () => {
  describe('getConstraintExpressions', () => {
    it('returns empty array for undefined constraint type', () => {
      const constraint: Constraint = { id: '1', props: { type: 'text', value: [] } }
      expect(getConstraintExpressions(constraint)).toEqual([])
    })

    it('extracts text constraint values', () => {
      const constraint: Constraint = {
        id: '1',
        props: {
          type: 'text',
          value: [{ value: 'test1' }, { value: 'test2' }],
        },
      }
      const result = getConstraintExpressions(constraint)
      expect(result).toEqual([
        { operator: '=', value: 'test1' },
        { operator: '=', value: 'test2' },
      ])
    })

    it('extracts numeric constraint values', () => {
      const constraint: Constraint = {
        id: '1',
        props: {
          type: 'num',
          value: [{ op: '>=', value: 10 }, { op: '<=', value: 20 }],
        },
      }
      const result = getConstraintExpressions(constraint)
      expect(result).toEqual([
        { operator: '>=', value: '10' },
        { operator: '<=', value: '20' },
      ])
    })
  })

  describe('constraintContainsExpression', () => {
    it('returns true when expression exists', () => {
      const constraint: Constraint = {
        id: '1',
        props: {
          type: 'text',
          value: [{ value: 'test' }],
        },
      }
      expect(constraintContainsExpression(constraint, '=', 'test')).toBe(true)
    })

    it('returns false when expression does not exist', () => {
      const constraint: Constraint = {
        id: '1',
        props: {
          type: 'text',
          value: [{ value: 'other' }],
        },
      }
      expect(constraintContainsExpression(constraint, '=', 'test')).toBe(false)
    })
  })
})
