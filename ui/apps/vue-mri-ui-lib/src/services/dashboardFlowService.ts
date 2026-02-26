import type { WizardFixedAttribute } from '../utils/dashboardFlowUtils'

export interface Constraint {
  id: string
  props: {
    type: 'text' | 'conceptSet' | 'num' | 'time' | 'datetime'
    name?: string
    value?: any
  }
}

export interface FilterCard {
  id: string
  props: {
    key: string
    excludeFilter?: boolean
  }
}

export interface ConstraintExpression {
  operator: string
  value: string
}

export interface ValueToApply {
  value: any
  includeDescendants?: boolean
}

export type ProcessedConstraintValue =
  | { type: 'numeric'; values: Array<{ op: string; value: number }> }
  | { type: 'date'; fromDate: Date; toDate: Date }
  | { type: 'text'; value: string; displayValue: string; includeDescendants?: boolean }

/**
 * Extract expressions from a constraint based on its type
 */
export function getConstraintExpressions(constraint: Constraint): ConstraintExpression[] {
  const constraintType = constraint?.props?.type
  if (!constraintType) {
    return []
  }

  if (constraintType === 'text' || constraintType === 'conceptSet') {
    const values = Array.isArray(constraint.props.value) ? constraint.props.value : []
    return values.map((item: any) => ({
      operator: '=',
      value: typeof item === 'object' && item !== null ? item.value : item,
    }))
  }

  if (constraintType === 'num') {
    const values = Array.isArray(constraint.props.value) ? constraint.props.value : []
    const expressions: ConstraintExpression[] = []
    values.forEach((item: any) => {
      if (Array.isArray(item?.and)) {
        item.and.forEach((andExpression: any) => {
          expressions.push({ operator: andExpression.op, value: String(andExpression.value) })
        })
        return
      }
      expressions.push({ operator: item?.op, value: String(item?.value) })
    })
    return expressions
  }

  if (constraintType === 'time' || constraintType === 'datetime') {
    const expressions: ConstraintExpression[] = []
    if (constraint.props.fromDate?.value) {
      expressions.push({ operator: '>=', value: constraint.props.fromDate.value })
    }
    if (constraint.props.toDate?.value) {
      expressions.push({ operator: '<=', value: constraint.props.toDate.value })
    }
    return expressions
  }

  return []
}

/**
 * Check if constraint contains a specific expression
 */
export function constraintContainsExpression(
  constraint: Constraint,
  operator: string,
  value: string | number
): boolean {
  const expectedOperator = String(operator || '=').trim()
  const expectedValue = String(value).trim()

  return getConstraintExpressions(constraint).some((expression) => {
    const expressionOperator = String(expression.operator || '').trim()
    const expressionValue = String(expression.value ?? '').trim()
    return expressionOperator === expectedOperator && expressionValue === expectedValue
  })
}

/**
 * Check if a filter card matches all fixed attributes
 */
export function cardMatchesFixedAttributes(
  fixedAttributes: WizardFixedAttribute[],
  getConstraintForAttribute: (key: string) => Constraint | undefined
): boolean {
  if (!fixedAttributes.length) {
    return true
  }

  return fixedAttributes.every((fixedAttribute) => {
    const attrKey = fixedAttribute.configPath.split('.').pop() || fixedAttribute.configPath
    const constraint = getConstraintForAttribute(attrKey)

    if (!constraint) {
      return false
    }

    return constraintContainsExpression(constraint, fixedAttribute.operator, fixedAttribute.value)
  })
}

/**
 * Find filter card ID that matches field criteria
 */
export function findFilterCardIdForField(
  filterCards: Record<string, FilterCard>,
  constraints: Record<string, Constraint>,
  filterCardPath: string,
  fixedAttributes: WizardFixedAttribute[],
  getConstraintForAttribute: (filterCardId: string, key: string) => Constraint | undefined
): string | null {
  const candidateCardIds = Object.keys(filterCards).filter((filterCardId) => {
    const filterCard = filterCards[filterCardId]
    return filterCard?.props?.key === filterCardPath && !filterCard?.props?.excludeFilter
  })

  return (
    candidateCardIds.find((filterCardId) => {
      return cardMatchesFixedAttributes(
        fixedAttributes,
        (key) => getConstraintForAttribute(filterCardId, key)
      )
    }) || null
  )
}
