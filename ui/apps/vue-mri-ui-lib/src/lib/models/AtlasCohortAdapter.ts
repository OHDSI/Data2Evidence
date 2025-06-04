/**
 * Adapter to convert between OHDSI Atlas Cohort Definition JSON and simplified Query Filter Model
 */

import { AtlasCohortDefinition, getCriteriaType, getCriteriaObject, InclusionRule } from './AtlasCohortDefinition'

import { QueryFilterCardModel, QueryFilterCondition, QueryFilterChip } from './QueryFilterModel'

export interface SimplifiedConcept {
  id: number
  name: string
  code: string
  vocabularyId: string
  domainId: string
  isExcluded: boolean
  includeDescendants: boolean
}

export interface SimplifiedConceptSet {
  id: number
  name: string
  concepts: SimplifiedConcept[]
}

export interface SimplifiedCriteria {
  type: string // 'ConditionOccurrence', 'DrugExposure', etc.
  conceptSetId: number
  conceptSetName?: string
  isTypeExcluded: boolean
  additionalCriteria?: {
    [key: string]: any
  }
}

export interface SimplifiedCohortDefinition {
  name?: string
  description?: string
  primaryCriteria: {
    criteriaList: SimplifiedCriteria[]
    observationWindow: {
      priorDays: number
      postDays: number
    }
  }
  conceptSets: SimplifiedConceptSet[]
  inclusionRules: Array<{
    name: string
    type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
    count?: number
    criteriaList: SimplifiedCriteria[]
  }>
  exclusionRules?: Array<{
    name: string
    criteriaList: SimplifiedCriteria[]
  }>
}

export class AtlasCohortAdapter {
  /**
   * Convert Atlas cohort definition to simplified format
   */
  static toSimplified(atlasDef: AtlasCohortDefinition): SimplifiedCohortDefinition {
    // Extract concept sets
    const conceptSets: SimplifiedConceptSet[] = atlasDef.ConceptSets.map(cs => ({
      id: cs.id,
      name: cs.name,
      concepts: cs.expression.items.map(item => ({
        id: item.concept.CONCEPT_ID,
        name: item.concept.CONCEPT_NAME,
        code: item.concept.CONCEPT_CODE,
        vocabularyId: item.concept.VOCABULARY_ID,
        domainId: item.concept.DOMAIN_ID,
        isExcluded: item.isExcluded,
        includeDescendants: item.includeDescendants,
      })),
    }))

    // Extract primary criteria
    const primaryCriteriaList = atlasDef.PrimaryCriteria.CriteriaList.map(item => {
      const type = getCriteriaType(item)
      const criteria = getCriteriaObject(item)

      return {
        type: type || 'Unknown',
        conceptSetId: criteria?.CodesetId || 0,
        conceptSetName: conceptSets.find(cs => cs.id === criteria?.CodesetId)?.name,
        isTypeExcluded: criteria ? this.isExcluded(criteria) : false,
        additionalCriteria: this.extractAdditionalCriteria(criteria),
      }
    })

    // Extract inclusion rules
    const inclusionRules = atlasDef.InclusionRules.map(rule => ({
      name: rule.name,
      type: rule.expression.Type as 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST',
      count: rule.expression.Count,
      criteriaList: this.extractCriteriaFromRule(rule),
    }))

    return {
      primaryCriteria: {
        criteriaList: primaryCriteriaList,
        observationWindow: {
          priorDays: atlasDef.PrimaryCriteria.ObservationWindow.PriorDays,
          postDays: atlasDef.PrimaryCriteria.ObservationWindow.PostDays,
        },
      },
      conceptSets,
      inclusionRules,
    }
  }

  /**
   * Convert simplified cohort definition to Query Filter Model
   */
  static toQueryFilterModel(simplified: SimplifiedCohortDefinition): QueryFilterCardModel[] {
    const filters: QueryFilterCardModel[] = []

    // Create primary criteria filter
    if (simplified.primaryCriteria.criteriaList.length > 0) {
      const primaryFilter = new QueryFilterCardModel({
        title: 'Primary Events',
        type: 'inclusion',
        conditions: simplified.primaryCriteria.criteriaList.map(criteria =>
          this.criteriaToCondition(criteria, simplified.conceptSets)
        ),
      })
      filters.push(primaryFilter)
    }

    // Create filters for inclusion rules
    simplified.inclusionRules.forEach(rule => {
      const inclusionFilter = new QueryFilterCardModel({
        title: rule.name,
        type: 'inclusion',
        conditions: rule.criteriaList.map(criteria => this.criteriaToCondition(criteria, simplified.conceptSets)),
      })
      filters.push(inclusionFilter)
    })

    // Create filters for exclusion rules if any
    if (simplified.exclusionRules) {
      simplified.exclusionRules.forEach(rule => {
        const exclusionFilter = new QueryFilterCardModel({
          title: rule.name,
          type: 'exclusion',
          conditions: rule.criteriaList.map(criteria => this.criteriaToCondition(criteria, simplified.conceptSets)),
        })
        filters.push(exclusionFilter)
      })
    }

    return filters
  }

  /**
   * Convert from Atlas JSON directly to Query Filter Models
   */
  static atlasToQueryFilters(atlasDef: AtlasCohortDefinition): QueryFilterCardModel[] {
    const simplified = this.toSimplified(atlasDef)
    return this.toQueryFilterModel(simplified)
  }

  private static criteriaToCondition(
    criteria: SimplifiedCriteria,
    conceptSets: SimplifiedConceptSet[]
  ): QueryFilterCondition {
    const conceptSet = conceptSets.find(cs => cs.id === criteria.conceptSetId)

    // Create chips from concepts
    const chips: QueryFilterChip[] =
      conceptSet?.concepts
        .filter(c => !c.isExcluded) // Only include non-excluded concepts as chips
        .map(concept => ({
          id: `chip_${concept.id}`,
          label: concept.name,
          value: concept.code,
          color: this.getDomainColor(concept.domainId),
        })) || []

    return {
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conceptSet: conceptSet?.name || `Concept Set ${criteria.conceptSetId}`,
      conceptSetId: criteria.conceptSetId.toString(),
      chips,
    }
  }

  private static isExcluded(criteria: any): boolean {
    // Check for type-specific exclude properties
    return (
      criteria.ConditionTypeExclude ||
      criteria.DrugTypeExclude ||
      criteria.ProcedureTypeExclude ||
      criteria.ObservationTypeExclude ||
      criteria.VisitTypeExclude ||
      criteria.DeviceTypeExclude ||
      criteria.MeasurementTypeExclude ||
      criteria.DeathTypeExclude ||
      false
    )
  }

  private static extractAdditionalCriteria(criteria: any): any {
    if (!criteria) return {}

    const additional: any = {}

    // Extract common additional criteria
    if (criteria.OccurrenceStartDate) additional.occurrenceStartDate = criteria.OccurrenceStartDate
    if (criteria.OccurrenceEndDate) additional.occurrenceEndDate = criteria.OccurrenceEndDate
    if (criteria.Age) additional.age = criteria.Age
    if (criteria.Gender) additional.gender = criteria.Gender
    if (criteria.VisitType) additional.visitType = criteria.VisitType

    // Extract type-specific criteria
    if (criteria.DaysSupplyRange) additional.daysSupplyRange = criteria.DaysSupplyRange
    if (criteria.QuantityRange) additional.quantityRange = criteria.QuantityRange
    if (criteria.ValueAsNumber) additional.valueAsNumber = criteria.ValueAsNumber
    if (criteria.ValueAsConcept) additional.valueAsConcept = criteria.ValueAsConcept

    return additional
  }

  private static extractCriteriaFromRule(rule: InclusionRule): SimplifiedCriteria[] {
    const criteriaList: SimplifiedCriteria[] = []

    // Extract from main criteria list
    if (rule.expression.CriteriaList) {
      rule.expression.CriteriaList.forEach(group => {
        if (group.Criteria) {
          const type = getCriteriaType(group.Criteria)
          const criteria = getCriteriaObject(group.Criteria)

          if (type && criteria) {
            criteriaList.push({
              type,
              conceptSetId: criteria.CodesetId || 0,
              isTypeExcluded: this.isExcluded(criteria),
              additionalCriteria: this.extractAdditionalCriteria(criteria),
            })
          }
        }
      })
    }

    return criteriaList
  }

  private static getDomainColor(domainId: string): string {
    const colorMap: { [key: string]: string } = {
      Condition: '#e74c3c', // Red
      Drug: '#3498db', // Blue
      Procedure: '#9b59b6', // Purple
      Observation: '#f39c12', // Orange
      Measurement: '#1abc9c', // Turquoise
      Visit: '#2ecc71', // Green
      Device: '#95a5a6', // Gray
      Death: '#34495e', // Dark Gray
    }

    return colorMap[domainId] || '#7f8c8d' // Default gray
  }
}
