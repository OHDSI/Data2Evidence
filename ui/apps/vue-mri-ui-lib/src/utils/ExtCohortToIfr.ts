import {
  IFRDefinition,
  BaseCriteria,
  ConceptSetElement,
  ConceptItem,
  ConceptSet,
  InclusionCriteria,
} from './IfrToExtCohortDeps/types'
import _ from 'lodash'
import backendConfig from './configs/BackendConfigStatic.json'
import frontendConfig from './configs/FrontendConfigStatic.json'

export const convertExtCohortToIFR = (extCohort: any, datasetId: string, feconf?, beconf?): IFRDefinition => {
  const conceptSets = extCohort.ConceptSets
  const inclusionRules = extCohort.InclusionRules
  const entryCriteriaList = extCohort.PrimaryCriteria.CriteriaList
  const exitCriteria = extCohort.CensoringCriteria

  const configMeta = feconf ? feconf.meta : frontendConfig.meta

  let instanceCounter = 1

  const filterInclusionRules = (inclusionRules: InclusionCriteria) => {
    const hasDemographicCriteria = inclusionRules.filter(
      rule =>
        rule.expression?.DemographicCriteriaList &&
        rule.expression.DemographicCriteriaList.length > 0 &&
        rule.expression.CriteriaList.length === 0
    )

    const hasOtherCriteria = inclusionRules.filter(
      rule => !rule.expression?.DemographicCriteriaList || rule.expression.DemographicCriteriaList.length === 0
    )

    return { hasDemographicCriteria, hasOtherCriteria }
  }
  const { hasDemographicCriteria, hasOtherCriteria } = filterInclusionRules(inclusionRules)

  const getConfigPath = (cohortDefinitionKey: string) => {
    const path = _.findKey(backendConfig.config.patient.interactions, value => {
      return value.cohortDefinitionKey === cohortDefinitionKey
    })
    return path ? `patient.interactions.${path}` : 'patient.interactions.default'
  }

  const getDefaultAttributePath = (configPath: string): string => {
    const interactionPath = `config.${configPath}.attributes`
    const attributes = _.get(frontendConfig, interactionPath, {})

    const attributeKey = _.findKey(attributes, attribute => _.get(attribute, 'filtercard.initial') === true)
    return attributeKey ? `attributes.${attributeKey}` : undefined
  }

  const getConceptNameConfigPath = (configPath: string): string => {
    const searchPath = `config.${configPath}.attributes`
    const attributes = _.get(backendConfig, searchPath, {})
    const attributeKey = _.findKey(attributes, (_, key) => key.toLowerCase().includes('concept_name'))

    return `attributes.${attributeKey}`
  }

  const getFilterCardName = (cohortDefinitionKey: string) => {
    const configPath = getConfigPath(cohortDefinitionKey)

    const config = _.get(backendConfig.config, configPath)
    if (!config) {
      throw new Error(`Config not found for path: ${configPath}`)
    }

    return config.name
  }

  const getConceptSet = (codesetId: number): ConceptSet => {
    const conceptSet = conceptSets.find((set: ConceptSet) => set.id === codesetId)
    if (!conceptSet) {
      throw new Error(`Concept set with ID ${codesetId} not found`)
    }
    return conceptSet
  }

  const extractConceptNames = (conceptItems: ConceptSetElement): string[] => {
    return conceptItems.map((item: ConceptItem) => item.concept.CONCEPT_NAME)
  }

  const createBasicDataFilterCard = () => {
    const seenProperties = new Set<string>()

    const basicFilterCards = [
      {
        configPath: 'patient.attributes.Age',
        instanceID: 'patient.attributes.Age',
        type: 'Attribute',
        constraints: {
          content: [],
          type: 'BooleanContainer',
          op: 'OR',
        },
      },
      {
        configPath: 'patient.attributes.Gender_concept_name',
        instanceID: 'patient.attributes.Gender_concept_name',
        type: 'Attribute',
        constraints: {
          content: [],
          type: 'BooleanContainer',
          op: 'OR',
        },
      },
    ]

    const OPERATORS = {
      gte: '>=',
      gt: '>',
      lte: '<=',
      lt: '<',
    }

    if (hasDemographicCriteria.length > 0) {
      hasDemographicCriteria.forEach(rule => {
        const demographicCriteriaList = rule.expression.DemographicCriteriaList

        demographicCriteriaList.forEach(criteria => {
          if (criteria.Age && !Array.isArray(criteria.Age) && !seenProperties.has('Age')) {
            basicFilterCards[0].constraints.content.push({
              type: 'Expression',
              operator: OPERATORS[criteria.Age.Op],
              value: criteria.Age.Value,
            })
            seenProperties.add('Age')
          }

          if (criteria.Gender && Array.isArray(criteria.Gender) && !seenProperties.has('Gender')) {
            const genderConcept = criteria.Gender[0]
            if (
              genderConcept.CONCEPT_NAME.toUpperCase() === 'MALE' ||
              genderConcept.CONCEPT_NAME.toUpperCase() === 'FEMALE'
            ) {
              basicFilterCards[1].constraints.content.push({
                type: 'Expression',
                operator: '=',
                value: genderConcept.CONCEPT_NAME.toUpperCase(),
              })
            }
            seenProperties.add('Gender')
          }
        })
      })
    }

    return [
      {
        content: [
          {
            configPath: 'patient',
            instanceNumber: 0,
            instanceID: 'patient',
            name: 'Basic Data',
            inactive: false,
            isEntry: false,
            isExit: false,
            type: 'FilterCard',
            attributes: {
              content: basicFilterCards,
              type: 'BooleanContainer',
              op: 'AND',
            },
            advanceTimeFilter: null,
          },
        ],
        type: 'BooleanContainer',
        op: 'OR',
      },
    ]
  }

  const createInclusionFilterCards = () => {
    return hasOtherCriteria.map(rule => {
      const filterCards = []
      const criteriaList = rule.expression.CriteriaList
      criteriaList.forEach(criteria => {
        const cohortDefinitionKey = Object.keys(criteria.Criteria)[0]
        filterCards.push(createFilterCard(criteria.Criteria, cohortDefinitionKey, false, false))
      })

      return {
        content: filterCards,
        type: 'BooleanContainer',
        op: 'OR',
      }
    })
  }

  const createFilterCard = (criteria: BaseCriteria, cohortDefinitionKey: string, isEntry: boolean, isExit: boolean) => {
    const configPath = getConfigPath(cohortDefinitionKey)
    const instanceID = `${configPath}.${instanceCounter}`
    const name = getFilterCardName(cohortDefinitionKey)

    const buildAttributes = (criteria, configPath, instanceId) => {
      if (!('CodesetId' in criteria[cohortDefinitionKey])) {
        const defaultAttributePath = getDefaultAttributePath(configPath)
        if (!defaultAttributePath) {          
          return
        } else {
          return {
            configPath: `${configPath}.${defaultAttributePath}`,
            instanceID: `${instanceId}.${defaultAttributePath}.`,
            type: 'Attribute',
            constraints: {
              content: [],
              type: 'BooleanContainer',
              op: 'OR',
            },
          }
        }
      } else {
        const conceptSet = getConceptSet(criteria[cohortDefinitionKey].CodesetId)
        const conceptNames = extractConceptNames(conceptSet.expression.items)
        const conceptNameConfigPath = getConceptNameConfigPath(configPath)
        return {
          configPath: `${configPath}.${conceptNameConfigPath}`,
          instanceID: `${instanceId}.${conceptNameConfigPath}.`,
          type: 'Attribute',
          constraints: {
            content: conceptNames.map(name => ({
              type: 'Expression',
              operator: '=',
              value: name,
            })),
            type: 'BooleanContainer',
            op: 'OR',
          },
        }
      }
    }

    const filterCard = {
      configPath,
      instanceNumber: instanceCounter,
      instanceID,
      name,
      inactive: false,
      isEntry,
      isExit,
      type: 'FilterCard',
      attributes: {
        content: [buildAttributes(criteria, configPath, instanceID)].filter(Boolean),
        type: 'BooleanContainer',
        op: 'AND',
      },
      advanceTimeFilter: null,
    }
    instanceCounter++
    return filterCard
  }

  const createEntryFilterCards = () => {
    if (entryCriteriaList.length > 0) {
      const criteria = entryCriteriaList[0]
      const cohortDefinitionKey = Object.keys(criteria)[0]
      return [
        {
          content: [createFilterCard(criteria, cohortDefinitionKey, true, false)],
          type: 'BooleanContainer',
          op: 'OR',
        },
      ]
    }
    return []
  }

  const createExitFilterCards = () => {
    if (exitCriteria.length > 0) {
      const criteria = exitCriteria[0]
      const cohortDefinitionKey = Object.keys(criteria)[0]
      return [
        {
          content: [createFilterCard(criteria, cohortDefinitionKey, false, true)],
          type: 'BooleanContainer',
          op: 'OR',
        },
      ]
    }
    return []
  }

  const basicFilters = createBasicDataFilterCard()
  const filterCards = createInclusionFilterCards()
  const entryCards = createEntryFilterCards()
  const exitCards = createExitFilterCards()

  const allFilterCards = [...basicFilters, ...filterCards, ...entryCards, ...exitCards]
  return {
    filter: {
      configMetadata: {
        id: configMeta.configId,
        version: configMeta.configVersion,
      },
      cards: {
        content: allFilterCards,
        type: 'BooleanContainer',
        op: 'AND',
      },
      sort: 'MRI_PA_CHART_SORT_DEFAULT',
    },
    chartType: 'stacked',
    axisSelection: [
      { attributeId: 'n/a', binsize: 'n/a', categoryId: 'x1' },
      { attributeId: 'n/a', binsize: 'n/a', categoryId: 'x2' },
      { attributeId: 'n/a', binsize: 'n/a', categoryId: 'x3' },
      { attributeId: 'n/a', binsize: 'n/a', categoryId: 'x4' },
      { attributeId: 'patient.attributes.pcount', categoryId: 'y1' },
    ],
    metadata: { version: 3 },
    datasetId,
  }
}
