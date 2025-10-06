import type { QueryFilterAttribute, QueryFilterNestedCriteria } from '../../types/QueryFilterTypes'
import type { ConceptSetItemDisplay, StoredConceptItem } from '../../types/ConceptSetTypes'

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
): attr is Extract<
  QueryFilterAttribute,
  {
    attributeType: 'standard'
    configType: 'numericRange'
  }
> => {
  // Check for standard type with numericRange config
  // Note: attributeType can only be 'nested' or 'standard', never 'numericRange'
  return attr.attributeType === 'standard' && 'configType' in attr && attr.configType === 'numericRange'
}

export const isConceptSetAttribute = (
  attr: QueryFilterAttribute
): attr is Extract<
  QueryFilterAttribute,
  {
    attributeType: 'standard'
    configType: 'conceptSet'
  }
> => {
  // Check for standard type with conceptSet config
  return attr.attributeType === 'standard' && 'configType' in attr && attr.configType === 'conceptSet'
}

export const isConceptAttribute = (
  attr: QueryFilterAttribute
): attr is Extract<
  QueryFilterAttribute,
  {
    attributeType: 'standard'
    configType: 'concept'
  }
> => {
  // Check for standard type with concept config
  return attr.attributeType === 'standard' && 'configType' in attr && attr.configType === 'concept'
}

export const isDateRangeAttribute = (
  attr: QueryFilterAttribute
): attr is Extract<
  QueryFilterAttribute,
  {
    attributeType: 'standard'
    configType: 'dateRange'
  }
> => {
  // Check for standard type with dateRange config
  return attr.attributeType === 'standard' && 'configType' in attr && attr.configType === 'dateRange'
}

export const hasAttributeId = (
  attr: QueryFilterAttribute
): attr is Extract<QueryFilterAttribute, { attributeId: string }> => {
  return 'attributeId' in attr
}
