export type WizardFieldType = 'text' | 'num' | 'datetime' | 'time' | 'yearRange' | 'conceptSet'

export interface WizardFixedAttribute {
  configPath: string
  operator: string
  value: string | number
}

export interface WizardFieldDefinition {
  id: string
  label?: string
  type?: WizardFieldType
  required?: boolean
  configPath?: string
  filterCardPath?: string
  fixedAttributes?: WizardFixedAttribute[]
  isWizardField?: boolean
  allowFreeText?: boolean
  placeholder?: string
}

export interface WizardDefinitionLike {
  id: string
  fields: WizardFieldDefinition[]
}

export interface WizardDefinition {
  id: string
  name: string
  description?: string
  fields: WizardFieldDefinition[]
}

export interface BookmarkExpression {
  type: 'Expression'
  operator: string
  value: string | number
}

export interface BookmarkBooleanContainer {
  type: 'BooleanContainer'
  op?: 'AND' | 'OR' | 'NOT'
  content?: Array<BookmarkBooleanContainer | BookmarkExpression | BookmarkFilterCard | BookmarkAttribute>
}

export interface BookmarkAttribute {
  type: 'Attribute'
  configPath: string
  instanceID?: string
  constraints: BookmarkBooleanContainer
}

export interface BookmarkFilterCard {
  type: 'FilterCard'
  configPath: string
  instanceID?: string
  attributes: BookmarkBooleanContainer
}

export type MissingRequiredReason =
  | 'NO_MATCHING_CARD'
  | 'MISSING_FIXED_ATTRIBUTES'
  | 'NO_ATTRIBUTE_CONSTRAINT'
  | 'EMPTY_CONSTRAINT'

export interface MissingRequiredField extends WizardFieldDefinition {
  label: string
  configPath: string
  filterCardPath: string
  reason: MissingRequiredReason
}

export interface FieldComparisonBreakdown {
  fieldId: string
  filterCardPath: string
  required: boolean
  candidateCardsByPath: number
  candidateCardsAfterFixedAttributes: number
  hasAttributeConstraint: boolean
  hasAttributeValue: boolean
  satisfied: boolean
  reason?: MissingRequiredReason
}

export interface RequiredFieldValidationResult {
  missingFields: MissingRequiredField[]
  breakdown: FieldComparisonBreakdown[]
}

function getLastPathSegment(path: string): string {
  const tokens = path.split('.')
  return tokens[tokens.length - 1] || path
}

function normalizeComparableValue(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return ''
  }
  return String(value).trim()
}

function extractExpressions(container: BookmarkBooleanContainer | undefined | null): BookmarkExpression[] {
  if (!container || !Array.isArray(container.content)) {
    return []
  }

  const expressions: BookmarkExpression[] = []

  container.content.forEach(item => {
    if (!item || typeof item !== 'object') {
      return
    }

    if ((item as BookmarkExpression).type === 'Expression') {
      expressions.push(item as BookmarkExpression)
      return
    }

    if ((item as BookmarkBooleanContainer).type === 'BooleanContainer') {
      expressions.push(...extractExpressions(item as BookmarkBooleanContainer))
    }
  })

  return expressions
}

function expressionContainsValue(expression: BookmarkExpression): boolean {
  const value = normalizeComparableValue(expression.value)
  return value !== ''
}

function attributeHasValue(attribute: BookmarkAttribute): boolean {
  const expressions = extractExpressions(attribute.constraints)
  return expressions.some(expressionContainsValue)
}

function getAttributeByConfigPath(card: BookmarkFilterCard, configPath: string): BookmarkAttribute | null {
  const attributes = Array.isArray(card.attributes?.content) ? card.attributes.content : []

  const attribute = attributes.find(item => {
    return (item as BookmarkAttribute)?.type === 'Attribute' && (item as BookmarkAttribute).configPath === configPath
  })

  return (attribute as BookmarkAttribute) || null
}

function fixedAttributeMatches(card: BookmarkFilterCard, fixedAttribute: WizardFixedAttribute): boolean {
  const attribute = getAttributeByConfigPath(card, fixedAttribute.configPath)
  if (!attribute) {
    return false
  }

  const expectedOperator = normalizeComparableValue(fixedAttribute.operator)
  const expectedValue = normalizeComparableValue(fixedAttribute.value)
  const expressions = extractExpressions(attribute.constraints)

  return expressions.some(expression => {
    const operatorMatch = normalizeComparableValue(expression.operator) === expectedOperator
    const valueMatch = normalizeComparableValue(expression.value) === expectedValue
    return operatorMatch && valueMatch
  })
}

function getFieldFilterCardPath(field: WizardFieldDefinition): string {
  if (field.filterCardPath) {
    return field.filterCardPath
  }

  if (!field.configPath || field.configPath.indexOf('.attributes.') === -1) {
    return 'patient'
  }

  return field.configPath.split('.attributes.')[0]
}

export interface CdwConfigAttribute {
  id?: string
  type?: string
  name?: string
}

export interface CdwConfig {
  attributes?: CdwConfigAttribute[]
  interactions?: Array<{
    id?: string
    attributes?: CdwConfigAttribute[]
  }>
}

function getAttributeByPath(cdwConfig: CdwConfig, configPath: string): CdwConfigAttribute | null {
  if (!cdwConfig || !configPath) {
    return null
  }

  const pathParts = configPath.split('.')
  const attrId = pathParts[pathParts.length - 1]

  if (pathParts.includes('interactions')) {
    const interactionIndex = pathParts.indexOf('interactions')
    const interactionId = pathParts[interactionIndex + 1]

    const interaction = cdwConfig.interactions?.find(i => i.id === interactionId)
    if (interaction?.attributes) {
      return interaction.attributes.find(a => a.id === attrId) || null
    }
  }

  if (cdwConfig.attributes) {
    return cdwConfig.attributes.find(a => a.id === attrId) || null
  }

  return null
}

function getFieldType(field: WizardFieldDefinition): string {
  return field.type || 'text'
}

export function resolveFieldType(field: WizardFieldDefinition, cdwConfig?: CdwConfig): WizardFieldType {
  if (field.type && field.type !== 'text') {
    return field.type as WizardFieldType
  }

  if (!field.configPath || !cdwConfig) {
    return (field.type as WizardFieldType) || 'text'
  }

  const attr = getAttributeByPath(cdwConfig, field.configPath)
  const attrType = attr?.type

  if (attrType === 'yearRange') return 'yearRange'
  if (attrType === 'conceptSet') return 'conceptSet'
  if (attrType === 'num' || attrType === 'number') return 'num'
  if (attrType === 'date' || attrType === 'datetime' || attrType === 'time') return attrType as WizardFieldType

  return (field.type as WizardFieldType) || 'text'
}

function getFieldLabel(field: WizardFieldDefinition): string {
  return field.label || field.id
}

function isMriBackedRequiredField(field: WizardFieldDefinition): boolean {
  // Include fields that:
  // 1. Are required
  // 2. Either have a configPath (map to MRI filters), OR are yearRange type
  //    (yearRange fields like "year" don't have configPath but need to be shown)
  // Note: isWizardField fields (like condition fields) ARE included here to appear in missing fields modal
  // Filter card creation for isWizardField fields is handled separately in useDashboardFlow.ts
  return !!field.required && (!!field.configPath || field.type === 'yearRange')
}

export function extractFilterCards(
  cardsContainer: BookmarkBooleanContainer | BookmarkFilterCard | null
): BookmarkFilterCard[] {
  if (!cardsContainer || typeof cardsContainer !== 'object') {
    return []
  }

  if ((cardsContainer as BookmarkFilterCard).type === 'FilterCard') {
    return [cardsContainer as BookmarkFilterCard]
  }

  const container = cardsContainer as BookmarkBooleanContainer
  if (container.type !== 'BooleanContainer' || !Array.isArray(container.content)) {
    return []
  }

  const cards: BookmarkFilterCard[] = []
  container.content.forEach(item => {
    if (!item || typeof item !== 'object') {
      return
    }

    if ((item as BookmarkFilterCard).type === 'FilterCard') {
      cards.push(item as BookmarkFilterCard)
      return
    }

    if ((item as BookmarkBooleanContainer).type === 'BooleanContainer') {
      cards.push(...extractFilterCards(item as BookmarkBooleanContainer))
    }
  })

  return cards
}

export function validateRequiredFields(
  selectedWizard: WizardDefinitionLike,
  cardsContainer: BookmarkBooleanContainer | BookmarkFilterCard | null
): RequiredFieldValidationResult {
  const missingFields: MissingRequiredField[] = []
  const breakdown: FieldComparisonBreakdown[] = []

  if (!selectedWizard || !Array.isArray(selectedWizard.fields)) {
    return { missingFields, breakdown }
  }

  const allCards = extractFilterCards(cardsContainer)

  selectedWizard.fields.filter(isMriBackedRequiredField).forEach(field => {
    const filterCardPath = getFieldFilterCardPath(field)
    const cardsByPath = allCards.filter(card => card.configPath === filterCardPath)
    const fixedAttributes = field.fixedAttributes || []
    const cardsAfterFixedAttributes = cardsByPath.filter(card => {
      return fixedAttributes.every(fixedAttribute => fixedAttributeMatches(card, fixedAttribute))
    })

    const breakdownItem: FieldComparisonBreakdown = {
      fieldId: field.id,
      filterCardPath,
      required: true,
      candidateCardsByPath: cardsByPath.length,
      candidateCardsAfterFixedAttributes: cardsAfterFixedAttributes.length,
      hasAttributeConstraint: false,
      hasAttributeValue: false,
      satisfied: false,
    }

    if (!cardsByPath.length) {
      breakdownItem.reason = 'NO_MATCHING_CARD'
      breakdown.push(breakdownItem)
      missingFields.push({
        ...field,
        label: getFieldLabel(field),
        type: getFieldType(field) as WizardFieldType,
        configPath: field.configPath as string,
        filterCardPath,
        reason: 'NO_MATCHING_CARD',
      })
      return
    }

    if (!cardsAfterFixedAttributes.length) {
      breakdownItem.reason = 'MISSING_FIXED_ATTRIBUTES'
      breakdown.push(breakdownItem)
      missingFields.push({
        ...field,
        label: getFieldLabel(field),
        type: getFieldType(field) as WizardFieldType,
        configPath: field.configPath as string,
        filterCardPath,
        reason: 'MISSING_FIXED_ATTRIBUTES',
      })
      return
    }

    const attributes = cardsAfterFixedAttributes
      .map(card => getAttributeByConfigPath(card, field.configPath as string))
      .filter(Boolean) as BookmarkAttribute[]

    if (!attributes.length) {
      breakdownItem.reason = 'NO_ATTRIBUTE_CONSTRAINT'
      breakdown.push(breakdownItem)
      missingFields.push({
        ...field,
        label: getFieldLabel(field),
        type: getFieldType(field) as WizardFieldType,
        configPath: field.configPath as string,
        filterCardPath,
        reason: 'NO_ATTRIBUTE_CONSTRAINT',
      })
      return
    }

    breakdownItem.hasAttributeConstraint = true

    const hasAnyValue = attributes.some(attributeHasValue)
    breakdownItem.hasAttributeValue = hasAnyValue

    if (!hasAnyValue) {
      breakdownItem.reason = 'EMPTY_CONSTRAINT'
      breakdown.push(breakdownItem)
      missingFields.push({
        ...field,
        label: getFieldLabel(field),
        type: getFieldType(field) as WizardFieldType,
        configPath: field.configPath as string,
        filterCardPath,
        reason: 'EMPTY_CONSTRAINT',
      })
      return
    }

    breakdownItem.satisfied = true
    breakdown.push(breakdownItem)
  })

  return {
    missingFields,
    breakdown,
  }
}

export interface NumericFilterValue {
  op?: string
  value?: number
  and?: Array<{ op: string; value: number }>
}

export function parseNumericInput(rawValue: string): NumericFilterValue[] {
  const input = String(rawValue || '').trim()
  if (!input) {
    return []
  }

  // Comma-separated expressions, for example: >50,<=70
  if (input.includes(',')) {
    const values: NumericFilterValue[] = []
    const tokens = input
      .split(',')
      .map(token => token.trim())
      .filter(Boolean)

    for (const token of tokens) {
      const parsedToken = parseNumericInput(token)
      if (!parsedToken.length) {
        return []
      }
      values.push(...parsedToken)
    }
    return values
  }

  const rangeMatch = input.match(/^([[\]])\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*([[\]])$/)
  if (rangeMatch) {
    const lowerOp = rangeMatch[1] === '[' ? '>=' : '>'
    const upperOp = rangeMatch[4] === ']' ? '<=' : '<'
    return [
      {
        and: [
          { op: lowerOp, value: Number(rangeMatch[2]) },
          { op: upperOp, value: Number(rangeMatch[3]) },
        ],
      },
    ]
  }

  const operatorMatch = input.match(/^(>=|<=|>|<|=|!=)\s*(-?\d+(?:\.\d+)?)$/)
  if (operatorMatch) {
    return [
      {
        op: operatorMatch[1],
        value: Number(operatorMatch[2]),
      },
    ]
  }

  if (/^-?\d+(?:\.\d+)?$/.test(input)) {
    return [
      {
        op: '=',
        value: Number(input),
      },
    ]
  }

  return []
}

export function getFieldAttrKey(configPath: string): string {
  return getLastPathSegment(configPath)
}

export function getFieldFilterCardPathForField(field: WizardFieldDefinition): string {
  return getFieldFilterCardPath(field)
}

export interface YearRangeValue {
  from: string
  to: string
}

export function validateYearRange(value: YearRangeValue): { valid: boolean; error?: string } {
  const fromYear = value?.from ? parseInt(value.from, 10) : null
  const toYear = value?.to ? parseInt(value.to, 10) : null

  if (!fromYear && !toYear) {
    return { valid: true }
  }

  if (fromYear && toYear && fromYear > toYear) {
    return { valid: false, error: 'From year must be less than or equal to To year' }
  }

  const currentYear = new Date().getFullYear()
  if (fromYear && (fromYear < 1900 || fromYear > currentYear)) {
    return { valid: false, error: `From year must be between 1900 and ${currentYear}` }
  }
  if (toYear && (toYear < 1900 || toYear > currentYear)) {
    return { valid: false, error: `To year must be between 1900 and ${currentYear}` }
  }

  return { valid: true }
}

export function isConditionField(fieldId: string): boolean {
  return fieldId.toLowerCase().startsWith('condition')
}

export { getAttributeByPath }
