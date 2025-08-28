import type { QueryFilterAttribute, QueryFilterNestedCriteria } from '../../types/QueryFilterTypes'

// Type guards for QueryFilterAttribute discriminated union
export const isNestedAttribute = (
  attr: QueryFilterAttribute
): attr is QueryFilterAttribute & {
  attributeType: 'nested'
  nestedCriteria: QueryFilterNestedCriteria
} => {
  return attr.attributeType === 'nested'
}

export const isNumericRangeAttribute = (
  attr: QueryFilterAttribute
): attr is QueryFilterAttribute & {
  attributeId: string
  attributeType: 'numericRange'
  operator: string
  value: string
} => {
  return attr.attributeType === 'numericRange'
}

export const hasAttributeId = (
  attr: QueryFilterAttribute
): attr is Extract<QueryFilterAttribute, { attributeId: string }> => {
  return 'attributeId' in attr
}
