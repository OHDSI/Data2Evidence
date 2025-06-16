// Base types
export type BooleanOperator = 'AND' | 'OR'
export type ExpressionOperator = '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE' | 'IN'
export type ChartType = 'stacked' | 'grouped' | 'line' | 'bar' // extend as needed
export type SortType = 'MRI_PA_CHART_SORT_DEFAULT' | string // extend as needed

// Expression constraint type
export interface Expression {
  type: 'Expression'
  operator: ExpressionOperator
  value: string | number | boolean
}

// Boolean container for nested logic
export interface BooleanContainer {
  type: 'BooleanContainer'
  op: BooleanOperator
  content: (Expression | BooleanContainer)[]
}

// Attribute with constraints
export interface Attribute {
  configPath: string
  instanceID: string
  type: 'Attribute'
  constraints: BooleanContainer
}

// Filter card
export interface FilterCard {
  configPath: string
  instanceNumber: number
  instanceID: string
  name: string
  inactive: boolean
  isEntry: boolean
  isExit: boolean
  type: 'FilterCard'
  attributes: BooleanContainer
  advanceTimeFilter: any | null // specify more precisely if known
}

// Cards container
export interface CardsContainer {
  type: 'BooleanContainer'
  op: BooleanOperator
  content: (FilterCardContainer | FilterCard)[]
}

// Container for filter cards
export interface FilterCardContainer {
  type: 'BooleanContainer'
  op: BooleanOperator
  content: FilterCard[]
}

// Config metadata
export interface ConfigMetadata {
  id: string
  version: string
}

// Filter configuration
export interface Filter {
  configMetadata: ConfigMetadata
  cards: CardsContainer
  sort: SortType
}

// Axis selection
export interface AxisSelection {
  attributeId: string
  binsize: string
  categoryId: string
}

// Metadata
export interface Metadata {
  version: number
}

// Main configuration interface
export interface MRIFilterConfiguration {
  filter: Filter
  chartType: ChartType
  axisSelection: AxisSelection[]
  metadata: Metadata
  datasetId: string
}

// Helper type for any content that can appear in boolean containers
export type BooleanContainerContent = Expression | BooleanContainer | Attribute | FilterCard | FilterCardContainer

// Union type for all possible constraint content
export type ConstraintContent = Expression | BooleanContainer

// Type guards for runtime type checking
export function isExpression(obj: any): obj is Expression {
  return obj && obj.type === 'Expression' && 'operator' in obj && 'value' in obj
}

export function isBooleanContainer(obj: any): obj is BooleanContainer {
  return obj && obj.type === 'BooleanContainer' && 'op' in obj && 'content' in obj
}

export function isAttribute(obj: any): obj is Attribute {
  return obj && obj.type === 'Attribute' && 'configPath' in obj && 'constraints' in obj
}

export function isFilterCard(obj: any): obj is FilterCard {
  return obj && obj.type === 'FilterCard' && 'configPath' in obj && 'attributes' in obj
}

// Example usage:
/*
const config: MRIFilterConfiguration = {
  filter: {
    configMetadata: {
      id: "4fce3cb7-32bf-4b46-8cba-32e4f77a14dd",
      version: "A"
    },
    cards: {
      type: "BooleanContainer",
      op: "AND",
      content: [
        // ... filter cards
      ]
    },
    sort: "MRI_PA_CHART_SORT_DEFAULT"
  },
  chartType: "stacked",
  axisSelection: [
    {
      attributeId: "n/a",
      binsize: "n/a", 
      categoryId: "x1"
    }
  ],
  metadata: {
    version: 3
  },
  datasetId: "180792d3-e654-4d6c-bae6-8965504a6c9c"
}
*/
