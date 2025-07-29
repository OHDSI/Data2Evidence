/**
 * Configuration loader for cohort criteria types and their properties
 */

// Import JSON configuration
import criteriaConfigData from '../config/cohort-criteria-config.json'
// Import types from AtlasCohortDefinition to avoid duplication
import type { ConceptSet, ConceptSetExpression, OccurrenceSettings } from '../models/AtlasCohortDefinition'

// Type definitions for the configuration structure
export interface CriteriaType {
  id: string
  name: string
  class: string
  icon: string
  atlasKey: string
  groupOnly?: boolean
  special?: boolean
  descriptions: {
    initial?: string
    censoring?: string
    group?: string
  }
}

export interface ConfigSection {
  criteriaTypes: string[]
}

export interface AttributeConfig {
  id: string
  name: string
  description?: string
  type?: string
  atlasKey?: string
  special?: boolean
  required?: boolean
}

export interface AttributeCategory {
  domains: string[]
  attributes: AttributeConfig[]
}

export interface CriteriaItem {
  CodesetId?: number
  type?: string
  conceptSets?: ConceptSet[]
  [key: string]: boolean | number | string | ConceptSet[] | undefined // For specific exclude flags like ConditionTypeExclude, DrugTypeExclude, etc.
}

export interface PrimaryCriteriaListItem {
  [criteriaType: string]: CriteriaItem // e.g., { "ConditionOccurrence": { CodesetId: 2, ConditionTypeExclude: false } }
}

export interface TemporalWindowBound {
  Days?: number
  Coeff?: number
}

export interface AtlasTemporalWindow {
  Start?: TemporalWindowBound
  End?: TemporalWindowBound
  UseIndexEnd?: boolean
  UseEventEnd?: boolean
}

export interface InclusionRuleCriteriaListItem {
  Criteria: PrimaryCriteriaListItem
  StartWindow?: AtlasTemporalWindow
  EndWindow?: AtlasTemporalWindow
  RestrictVisit?: boolean
  IgnoreObservationPeriod?: boolean
  Occurrence?: OccurrenceSettings
}

export interface CriteriaOption {
  id: string
  title: string
  defaultTitle: string
  description: string
  defaultDescription: string
  icon: string
  class: string
  atlasKey: string
  special: boolean
  selected?: boolean
  action?: () => CriteriaItem | void
}

export interface DropdownOption extends CriteriaOption {
  selected: boolean
  action: () => CriteriaItem | void
}

export interface CohortExpression {
  ConceptSets: ConceptSet[]
  PrimaryCriteria: () => {
    CriteriaList: PrimaryCriteriaListItem[]
  }
  CensoringCriteria: () => PrimaryCriteriaListItem[]
}

export interface TemporalWindow {
  id: string
  name: string
  description: string
}

export interface OccurrenceOperator {
  id: string
  name: string
  symbol: string
}

export interface CriteriaAttributeConfig {
  id: string
  name: string
  description: string
  type: string
  atlasKey: string
  special?: boolean
}

export interface AttributeOption {
  id: string
  title: string
  defaultTitle: string
  description: string
  defaultDescription: string
  type: string
  atlasKey: string
  special: boolean
  action: (criteriaInstance: CriteriaItem) => CriteriaItem | void
}

export interface CriteriaConfig {
  criteriaTypes: Record<string, CriteriaType>
  sections: Record<string, ConfigSection>
  attributes: Record<string, AttributeCategory>
  criteriaAttributes: Record<string, CriteriaAttributeConfig[]>
  temporalWindows: {
    types: TemporalWindow[]
  }
  occurrenceCount: {
    operators: OccurrenceOperator[]
  }
}

/**
 * Configuration loader class for cohort criteria
 */
export class CriteriaConfigLoader {
  private config: CriteriaConfig
  public criteriaTypes: Record<string, CriteriaType>
  public sections: Record<string, ConfigSection>
  public attributes: Record<string, AttributeCategory>

  constructor() {
    this.config = criteriaConfigData as CriteriaConfig
    this.criteriaTypes = this.config.criteriaTypes
    this.sections = this.config.sections
    this.attributes = this.config.attributes
  }

  /**
   * Get criteria options for a specific section (initial, censoring, group)
   * @param sectionId - The section identifier
   * @param descriptionType - The description type to use (initial, censoring, group)
   * @returns Array of criteria options for dropdown
   */
  getCriteriaOptions(sectionId: string, descriptionType: keyof CriteriaType['descriptions']): CriteriaOption[] {
    const section = this.sections[sectionId]
    if (!section) {
      throw new Error(`Section ${sectionId} not found in configuration`)
    }

    return section.criteriaTypes
      .map(typeId => {
        const criteriaType = this.criteriaTypes[typeId]
        if (!criteriaType) return null

        // Skip group-only criteria for initial/censoring events
        if (criteriaType.groupOnly && sectionId !== 'criteriaGroup') {
          return null
        }

        const description = criteriaType.descriptions[descriptionType] || criteriaType.descriptions.group || ''

        const displayTitle = this.getDisplayTitle(criteriaType.id, descriptionType)

        return {
          id: criteriaType.id,
          title: this.getI18nText(`cohortbuilder.criteria.${criteriaType.id}.title`, displayTitle),
          defaultTitle: displayTitle,
          description: this.getI18nText(`cohortbuilder.criteria.${criteriaType.id}.${descriptionType}`, description),
          defaultDescription: description,
          icon: criteriaType.icon,
          class: criteriaType.class,
          atlasKey: criteriaType.atlasKey,
          special: criteriaType.special || false,
        }
      })
      .filter((option): option is CriteriaOption => option !== null)
  }

  /**
   * Create action function for a criteria type
   * @param criteriaTypeId - The criteria type identifier
   * @param expression - The cohort expression
   * @param targetList - Where to add the criteria (PrimaryCriteria, CensoringCriteria, etc.)
   * @returns Action function to create the criteria
   */
  createActionFunction(
    criteriaTypeId: string,
    expression: CohortExpression,
    targetList: string = 'PrimaryCriteria'
  ): () => CriteriaItem | void {
    const criteriaType = this.criteriaTypes[criteriaTypeId]
    if (!criteriaType) {
      throw new Error(`Criteria type ${criteriaTypeId} not found`)
    }

    // Special handling for reusable criteria
    if (criteriaType.special && criteriaTypeId === 'fromReusable') {
      return () => {
        // This would trigger the reusable selection modal
        // Implementation depends on existing reusable functionality
        console.log('Opening reusable criteria selector...')
      }
    }

    // Special handling for group criteria
    if (criteriaTypeId === 'group') {
      return () => {
        // Return a new criteria group
        // Note: This would need access to actual CriteriaTypes implementation
        console.log('Creating new criteria group...')
        return { type: 'CriteriaGroup', conceptSets: expression.ConceptSets }
      }
    }

    return () => {
      console.log(`Creating new ${criteriaType.class} criteria for ${targetList}`)

      // Create new criteria instance
      const criteria = {
        type: criteriaType.class,
        conceptSets: expression.ConceptSets,
      }

      // Add to appropriate list
      if (targetList === 'PrimaryCriteria') {
        const criteriaItem: PrimaryCriteriaListItem = {}
        criteriaItem[criteriaType.class] = criteria
        expression.PrimaryCriteria().CriteriaList.push(criteriaItem)
      } else if (targetList === 'CensoringCriteria') {
        const criteriaItem: PrimaryCriteriaListItem = {}
        criteriaItem[criteriaType.class] = criteria
        expression.CensoringCriteria().push(criteriaItem)
      }

      return criteria
    }
  }

  /**
   * Get the Atlas internal key for a criteria type
   * @param criteriaTypeId - The criteria type identifier
   * @returns The Atlas internal key (e.g., "addConditionEra")
   */
  getAtlasKey(criteriaTypeId: string): string {
    const criteriaType = this.criteriaTypes[criteriaTypeId]
    return criteriaType ? criteriaType.atlasKey || criteriaTypeId : criteriaTypeId
  }

  /**
   * Get the display title with "Add" prefix for UI
   * @param criteriaTypeId - The criteria type identifier
   * @param context - The context (initial, censoring, group)
   * @returns The display title
   */
  getDisplayTitle(criteriaTypeId: string, context: string = 'initial'): string {
    const criteriaType = this.criteriaTypes[criteriaTypeId]
    if (!criteriaType) return criteriaTypeId

    // For initial and censoring events, add "Add" prefix
    if (context === 'initial' || context === 'censoring') {
      return criteriaType.name.startsWith('Add') ? criteriaType.name : `Add ${criteriaType.name}`
    }

    // For group context, remove "Add" prefix if present
    return criteriaType.name.replace(/^Add /, '')
  }

  /**
   * Generate dropdown options with actions for a specific section
   * @param sectionId - The section identifier
   * @param expression - The cohort expression
   * @param targetList - Where to add the criteria
   * @returns Array of dropdown options with action functions
   */
  generateDropdownOptions(
    sectionId: string,
    expression: CohortExpression,
    targetList: string = 'PrimaryCriteria'
  ): DropdownOption[] {
    const descriptionType =
      sectionId === 'initialEvents' ? 'initial' : sectionId === 'censoringEvents' ? 'censoring' : 'group'

    const options = this.getCriteriaOptions(sectionId, descriptionType as keyof CriteriaType['descriptions'])

    return options.map(option => ({
      ...option,
      selected: false,
      action: this.createActionFunction(option.id, expression, targetList),
    }))
  }

  /**
   * Get attributes for a specific criteria type
   * @param criteriaTypeId - The criteria type identifier
   * @returns Array of available attributes
   */
  getAttributesForCriteria(criteriaTypeId: string): Array<AttributeConfig & { category: string }> {
    const attributes: Array<AttributeConfig & { category: string }> = []

    Object.entries(this.attributes).forEach(([category, config]) => {
      if (config.domains.includes(criteriaTypeId)) {
        attributes.push(
          ...config.attributes.map(attr => ({
            ...attr,
            category: category,
          }))
        )
      }
    })

    return attributes
  }

  /**
   * Get criteria-specific attribute options (like Add Nested Criteria, Add Stop Reason)
   */
  getCriteriaAttributeOptions(criteriaTypeId: string): AttributeOption[] {
    // First check for criteria-specific attributes (like nested, stop reason, etc.)
    if (this.config.criteriaAttributes && this.config.criteriaAttributes[criteriaTypeId]) {
      return this.config.criteriaAttributes[criteriaTypeId].map(attr => {
        const displayTitle = this.getAttributeDisplayTitle(attr.id, attr.name)

        return {
          id: attr.id,
          title: this.getI18nText(`cohortbuilder.attributes.${attr.id}.title`, displayTitle),
          defaultTitle: displayTitle,
          description: this.getI18nText(`cohortbuilder.attributes.${attr.id}.description`, attr.description || ''),
          defaultDescription: attr.description || '',
          type: attr.type || 'text',
          atlasKey: attr.atlasKey || '',
          special: attr.special || false,
          action: this.createAttributeActionFunction(attr, criteriaTypeId),
        }
      })
    }

    // Fall back to domain-based attributes (like age, gender, etc.)
    const attributeCategory = Object.values(this.config.attributes).find(category =>
      category.domains.includes(criteriaTypeId)
    )

    if (!attributeCategory || !attributeCategory.attributes) {
      return []
    }

    return attributeCategory.attributes.map(attr => {
      const displayTitle = this.getAttributeDisplayTitle(attr.id, attr.name)

      return {
        id: attr.id,
        title: this.getI18nText(`cohortbuilder.attributes.${attr.id}.title`, displayTitle),
        defaultTitle: displayTitle,
        description: this.getI18nText(`cohortbuilder.attributes.${attr.id}.description`, attr.description || ''),
        defaultDescription: attr.description || '',
        type: attr.type || 'text',
        atlasKey: attr.atlasKey || '',
        special: attr.special || false,
        action: this.createAttributeActionFunction(attr as CriteriaAttributeConfig, criteriaTypeId),
      }
    })
  }

  /**
   * Create action function for attribute-level options
   */
  createAttributeActionFunction(
    attribute: CriteriaAttributeConfig,
    _criteriaTypeId: string
  ): (criteriaInstance: CriteriaItem) => CriteriaItem | void {
    return function (_criteriaInstance: CriteriaItem) {
      if (attribute.special && attribute.id === 'nested') {
        // Add nested criteria group
        console.log('Adding nested criteria group...')
        // This would create a new nested criteria group
        return { type: 'NestedCriteria', criteria: [] }
      }

      // For other attributes, this would trigger the appropriate editor
      // The actual implementation depends on the attribute type
      switch (attribute.type || '') {
        case 'text':
          // Would open text filter editor
          console.log(`Adding text filter: ${attribute.id}`)
          break
        case 'numericRange':
          // Would open numeric range editor
          console.log(`Adding numeric range: ${attribute.id}`)
          break
        case 'conceptSet':
          // Would open concept set selector
          console.log(`Adding concept set: ${attribute.id}`)
          break
        case 'dateRange':
          // Would open date range picker
          console.log(`Adding date range: ${attribute.id}`)
          break
        case 'dateAdjustment':
          // Would open date adjustment editor
          console.log(`Adding date adjustment: ${attribute.id}`)
          break
        case 'boolean':
          // Would toggle boolean flag
          console.log(`Toggling boolean: ${attribute.id}`)
          break
        default:
          console.log(`Unknown attribute type: ${attribute.type}`)
      }
    }
  }

  /**
   * Get display title for attribute with "Add" prefix
   */
  getAttributeDisplayTitle(_attributeId: string, baseName: string): string {
    // Don't add "Add" prefix for "Nested Criteria"
    if (baseName === 'Nested Criteria') {
      return baseName
    }
    // Always add "Add" prefix for other attribute options
    return baseName.startsWith('Add') ? baseName : `Add ${baseName}`
  }

  /**
   * Get temporal window options
   * @returns Array of temporal window types
   */
  getTemporalWindowOptions(): TemporalWindow[] {
    return this.config.temporalWindows.types
  }

  /**
   * Get occurrence count operators
   * @returns Array of occurrence count operators
   */
  getOccurrenceCountOperators(): OccurrenceOperator[] {
    return this.config.occurrenceCount.operators
  }

  /**
   * Helper method for i18n text (placeholder implementation)
   * In a real implementation, this would integrate with the Vue i18n system
   */
  private getI18nText(_key: string, fallback: string): string {
    // This would be replaced with actual i18n integration
    // For now, just return the fallback
    return fallback
  }
}

// Create and export singleton instance
const criteriaConfigLoader = new CriteriaConfigLoader()
export { criteriaConfigLoader }
export default criteriaConfigLoader
