/**
 * Configuration loader for cohort criteria types and their properties
 */

// Import JSON configuration
import configData from '../config/atlas-config.json'
// Import types from AtlasCohortDefinition to avoid duplication
import type { ConceptSet, OccurrenceSettings } from '../types/AtlasTypes'
import { atlasToCriteriaAttrMap } from './AtlasAttributeLookup'

// Type definitions for the configuration structure
export interface CriteriaType {
  id: string
  name: string
  class: string
  requiresConceptSet?: boolean
  groupOnly?: boolean
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
  domainFilter?: string
}

export interface AttributeOption {
  id: string
  title: string
  defaultTitle: string
  description: string
  defaultDescription: string
  type: string
  domainFilter?: string
  action: () => CriteriaItem | void
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

// Config interfaces
export interface ConfigCriteriaType {
  name: string
  requiresConceptSet?: boolean
  groupOnly?: boolean
  descriptions: {
    initial?: string
    censoring?: string
    group?: string
    all?: string
  }
}

export interface ConfigSection2 {
  name: string
  buttonText: string
  excludeTypes?: string[]
  includeAll?: boolean
}

export interface AttributeDefinition {
  id: string
  name: string
  description: string
  type: string
  domainFilter?: string
}

export interface Config {
  criteriaTypes: Record<string, ConfigCriteriaType>
  sections: Record<string, ConfigSection2>
  attributeMapping: Record<string, AttributeDefinition[]>
  temporalWindows: TemporalWindow[]
  occurrenceOperators: OccurrenceOperator[]
}

/**
 * Configuration loader class for cohort criteria
 */
export class ConfigLoader {
  private config: CriteriaConfig
  private criteriaTypes: Record<string, CriteriaType>
  private sections: Record<string, ConfigSection>
  private attributes: Record<string, AttributeCategory>
  private criteriaAttributes: Record<string, CriteriaAttributeConfig[]>
  private temporalWindows: {
    types: TemporalWindow[]
  }
  private occurrenceCount: {
    operators: OccurrenceOperator[]
  }

  constructor(config: Config) {
    // Always expand the config
    this.config = this.expandConfig(config)
    // Destructure all config properties
    this.criteriaTypes = this.config.criteriaTypes
    this.sections = this.config.sections
    this.attributes = this.config.attributes
    this.criteriaAttributes = this.config.criteriaAttributes || {}
    this.temporalWindows = this.config.temporalWindows
    this.occurrenceCount = this.config.occurrenceCount
  }

  private expandConfig(config: Config): CriteriaConfig {
    // Expand criteria types with derived properties
    const criteriaTypes: Record<string, CriteriaType> = {}
    Object.entries(config.criteriaTypes).forEach(([id, configType]) => {
      criteriaTypes[id] = {
        id,
        name: configType.name,
        class: this.capitalizeFirst(id), // e.g., conditionOccurrence -> ConditionOccurrence
        requiresConceptSet: configType.requiresConceptSet ?? true, // Default to true if not specified
        groupOnly: configType.groupOnly,
        descriptions: {
          initial: configType.descriptions.initial || configType.descriptions.all || '',
          censoring: configType.descriptions.censoring || configType.descriptions.all || '',
          group: configType.descriptions.group || configType.descriptions.all || '',
        },
      }
    })

    // Expand sections with criteriaTypes arrays
    const sections: Record<string, ConfigSection> = {}
    const allCriteriaTypeIds = Object.keys(criteriaTypes)
    Object.entries(config.sections).forEach(([sectionId, configSection]) => {
      if (configSection.includeAll) {
        sections[sectionId] = {
          criteriaTypes: allCriteriaTypeIds,
        }
      } else if (configSection.excludeTypes) {
        sections[sectionId] = {
          criteriaTypes: allCriteriaTypeIds.filter(id => !configSection.excludeTypes!.includes(id)),
        }
      } else {
        sections[sectionId] = {
          criteriaTypes: [],
        }
      }
    })

    // Expand attributes and criteriaAttributes from attributeMapping
    const attributes: Record<string, AttributeCategory> = {}
    const criteriaAttributes: Record<string, CriteriaAttributeConfig[]> = {}

    Object.entries(config.attributeMapping).forEach(([criteriaTypeId, mappings]) => {
      const attrs: CriteriaAttributeConfig[] = []

      mappings.forEach(mapping => {
        // All mappings are now inline attribute objects
        attrs.push({
          id: mapping.id,
          name: mapping.name,
          description: mapping.description,
          type: mapping.type,
          domainFilter: mapping.domainFilter,
        })
      })

      if (attrs.length > 0) {
        criteriaAttributes[criteriaTypeId] = attrs
      }
    })

    return {
      criteriaTypes,
      sections,
      attributes,
      criteriaAttributes,
      temporalWindows: {
        types: config.temporalWindows,
      },
      occurrenceCount: {
        operators: config.occurrenceOperators,
      },
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
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
          class: criteriaType.class,
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
    if (criteriaTypeId === 'fromReusable') {
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
    if (this.criteriaAttributes && this.criteriaAttributes[criteriaTypeId]) {
      return this.criteriaAttributes[criteriaTypeId].map(attr => {
        const displayTitle = this.getAttributeDisplayTitle(attr.id, attr.name)

        const result: AttributeOption = {
          id: attr.id,
          title: this.getI18nText(`cohortbuilder.attributes.${attr.id}.title`, displayTitle),
          defaultTitle: displayTitle,
          description: this.getI18nText(`cohortbuilder.attributes.${attr.id}.description`, attr.description || ''),
          defaultDescription: attr.description || '',
          type: attr.type || 'text',
          action: this.createAttributeActionFunction(attr),
        }

        // Only add domainFilter if it exists
        if (attr.domainFilter) {
          result.domainFilter = attr.domainFilter
        }

        return result
      })
    }

    // Fall back to domain-based attributes (like age, gender, etc.)
    const attributeCategory = Object.values(this.attributes).find(category => category.domains.includes(criteriaTypeId))

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
        action: this.createAttributeActionFunction(attr as CriteriaAttributeConfig),
      }
    })
  }

  /**
   * Create action function for attribute-level options
   */
  createAttributeActionFunction(attribute: CriteriaAttributeConfig): () => CriteriaItem | void {
    return function () {
      if (attribute.id === 'nested') {
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
        case 'userDefinedPeriod':
          console.log(`Adding user defined period: ${attribute.id}`)
          break
        default:
          console.log(`Unknown attribute type: ${attribute.type}`)
      }
      // Return undefined for cases that don't create new criteria items
      return undefined
    }
  }

  /**
   * Get specific attribute configuration for a criteria type and attribute ID
   */
  getAttributeConfig(criteriaTypeId: string, attributeId: string): CriteriaAttributeConfig | null {
    if (this.criteriaAttributes && this.criteriaAttributes[criteriaTypeId]) {
      const attribute = this.criteriaAttributes[criteriaTypeId].find(attr => attr.id === attributeId)
      if (attribute) return attribute
    }
    // Fallback: search in domain-based attributes (like getCriteriaAttributeOptions)
    const attributeCategory = Object.values(this.attributes).find(category => category.domains.includes(criteriaTypeId))
    if (attributeCategory && attributeCategory.attributes) {
      const attribute = attributeCategory.attributes.find(attr => attr.id === attributeId)
      if (attribute) {
        // Cast to CriteriaAttributeConfig for compatibility
        return attribute as CriteriaAttributeConfig
      }
    }
    return null
  }

  /**
   * Generate mapping from Atlas JSON property names to internal attribute IDs
   * This builds the mapping dynamically from the configuration instead of hardcoding it
   */
  getAtlasJsonToAttributeMapping(criteriaTypeId: string): Record<string, string> {
    const mapping: Record<string, string> = {}

    if (this.criteriaAttributes && this.criteriaAttributes[criteriaTypeId]) {
      this.criteriaAttributes[criteriaTypeId].forEach(attr => {
        // Convert internal attributeId to Atlas JSON property name format
        // e.g., 'gender' -> 'Gender', 'conditionType' -> 'ConditionType'
        const atlasJsonKey = attr.id.charAt(0).toUpperCase() + attr.id.slice(1)
        mapping[atlasJsonKey] = attr.id
      })
    }

    // Add some additional common mappings that don't follow the standard pattern
    const commonMappings = {
      ValueAsConcept: 'valueAsConcept',
      RouteConcept: 'routeConcept',
      DoseUnit: 'doseUnit',
      DeathSourceConcept: 'deathSourceConcept',
    }

    Object.assign(mapping, commonMappings)
    Object.assign(mapping, atlasToCriteriaAttrMap)

    return mapping
  }

  /**
   * Get all possible Atlas JSON to attribute mappings across all criteria types
   */
  getAllAtlasJsonToAttributeMappings(): Record<string, string> {
    const allMappings: Record<string, string> = {}

    if (this.criteriaAttributes) {
      Object.keys(this.criteriaAttributes).forEach(criteriaTypeId => {
        const typeMappings = this.getAtlasJsonToAttributeMapping(criteriaTypeId)
        Object.assign(allMappings, typeMappings)
      })
    }

    return allMappings
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
    return this.temporalWindows.types
  }

  /**
   * Get occurrence count operators
   * @returns Array of occurrence count operators
   */
  getOccurrenceCountOperators(): OccurrenceOperator[] {
    return this.occurrenceCount.operators
  }

  /**
   * Check if a criteria type requires a concept set selection
   * @param criteriaTypeId - The criteria type identifier (e.g., 'demographic', 'conditionOccurrence')
   * @returns true if the criteria type requires a concept set, false otherwise
   */
  requiresConceptSet(criteriaTypeId: string): boolean {
    const criteriaType = this.criteriaTypes[criteriaTypeId]
    if (!criteriaType) {
      // Default to true for unknown types to maintain backward compatibility
      return true
    }
    return criteriaType.requiresConceptSet ?? true
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
const configLoader = new ConfigLoader(configData as Config)
export { configLoader }
export default configLoader
