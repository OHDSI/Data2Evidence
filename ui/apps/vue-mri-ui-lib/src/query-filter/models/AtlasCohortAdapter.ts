/**
 * Adapter to convert between OHDSI Atlas Cohort Definition JSON and Query Filter Model
 */
import { AtlasCohortDefinition, getCriteriaType, getCriteriaObject, InclusionRule } from './AtlasCohortDefinition'
import { QueryFilterCardModel, QueryFilterEvent } from './QueryFilterModel'

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
  type: string
  conceptSetId: number
  conceptSetName?: string
  isTypeExcluded: boolean
  additionalCriteria?: Record<string, any>
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
}

export class AtlasCohortAdapter {
  static toSimplified(atlasDef: AtlasCohortDefinition): SimplifiedCohortDefinition {
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

  static toQueryFilterModel(simplified: SimplifiedCohortDefinition): QueryFilterCardModel[] {
    const filters: QueryFilterCardModel[] = []

    if (simplified.primaryCriteria.criteriaList.length > 0) {
      const primaryFilter = new QueryFilterCardModel({
        title: 'Primary Events',
        type: 'inclusion',
        events: simplified.primaryCriteria.criteriaList.map(criteria =>
          this.criteriaToEvent(criteria, simplified.conceptSets)
        ),
      })
      filters.push(primaryFilter)
    }

    simplified.inclusionRules.forEach(rule => {
      const inclusionFilter = new QueryFilterCardModel({
        title: rule.name,
        type: 'inclusion',
        events: rule.criteriaList.map(criteria => this.criteriaToEvent(criteria, simplified.conceptSets)),
      })
      filters.push(inclusionFilter)
    })

    return filters
  }

  static atlasToQueryFilters(atlasDef: AtlasCohortDefinition): QueryFilterCardModel[] {
    const simplified = this.toSimplified(atlasDef)
    return this.toQueryFilterModel(simplified)
  }

  private static criteriaToEvent(criteria: SimplifiedCriteria, conceptSets: SimplifiedConceptSet[]): QueryFilterEvent {
    const conceptSet = conceptSets.find(cs => cs.id === criteria.conceptSetId)

    const conceptSetDetails =
      conceptSet?.concepts
        .filter(c => !c.isExcluded)
        .map(concept => ({
          CONCEPT_ID: concept.id,
          CONCEPT_NAME: concept.name,
          CONCEPT_CODE: concept.code,
          DOMAIN_ID: concept.domainId,
        })) || []

    return {
      id: `event_${Date.now()}}`,
      conceptSet: conceptSet?.name || `Concept Set ${criteria.conceptSetId}`,
      conceptSetId: criteria.conceptSetId.toString(),
      conceptSetDetails,
    }
  }

  private static isExcluded(criteria: any): boolean {
    return Boolean(
      criteria.ConditionTypeExclude ||
        criteria.DrugTypeExclude ||
        criteria.ProcedureTypeExclude ||
        criteria.ObservationTypeExclude ||
        criteria.VisitTypeExclude ||
        criteria.DeviceTypeExclude ||
        criteria.MeasurementTypeExclude ||
        criteria.DeathTypeExclude
    )
  }

  private static extractAdditionalCriteria(criteria: any): any {
    if (!criteria) return {}

    const additional: Record<string, any> = {}

    if (criteria.OccurrenceStartDate) additional.occurrenceStartDate = criteria.OccurrenceStartDate
    if (criteria.OccurrenceEndDate) additional.occurrenceEndDate = criteria.OccurrenceEndDate
    if (criteria.Age) additional.age = criteria.Age
    if (criteria.Gender) additional.gender = criteria.Gender
    if (criteria.VisitType) additional.visitType = criteria.VisitType
    if (criteria.DaysSupplyRange) additional.daysSupplyRange = criteria.DaysSupplyRange
    if (criteria.QuantityRange) additional.quantityRange = criteria.QuantityRange
    if (criteria.ValueAsNumber) additional.valueAsNumber = criteria.ValueAsNumber
    if (criteria.ValueAsConcept) additional.valueAsConcept = criteria.ValueAsConcept

    return additional
  }

  private static extractCriteriaFromRule(rule: InclusionRule): SimplifiedCriteria[] {
    const criteriaList: SimplifiedCriteria[] = []

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
    const colorMap: Record<string, string> = {
      Condition: '#e74c3c',
      Drug: '#3498db',
      Procedure: '#9b59b6',
      Observation: '#f39c12',
      Measurement: '#1abc9c',
      Visit: '#2ecc71',
      Device: '#95a5a6',
      Death: '#34495e',
    }

    return colorMap[domainId] || '#7f8c8d'
  }
}
