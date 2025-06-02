import { ExtCohortDefinition, IFRDefinition } from './IfrToExtCohortDeps/types'
import _ from 'lodash'
import backendConfig from './configs/BackendConfigStatic.json'

export const convertExtCohortToIFR = (extCohort: ExtCohortDefinition): IFRDefinition => {
  const conceptSets = extCohort.ConceptSets
  const inclusionRules = extCohort.InclusionRules
  const [rulesWithDemographics, rulesWithoutDemographics] = inclusionRules.reduce(
    ([withDemographics, withoutDemographics], rule) => {
      if (rule.expression.DemographicCriteriaList && rule.expression.DemographicCriteriaList.length > 0) {
        withDemographics.push(rule)
      } else {
        withoutDemographics.push(rule)
      }
      return [withDemographics, withoutDemographics]
    },
    [[], []] as [typeof inclusionRules, typeof inclusionRules]
  )

  const createBasicDataFilterCard = () => {
    const basicFilterCards = []

    const OPERATORS = {
      gte: '>=',
      gt: '>',
      lte: '<=',
      lt: '<',
    }

    rulesWithDemographics.forEach(rule => {
      const demographicCriteriaList = rule.expression.DemographicCriteriaList

      demographicCriteriaList.forEach(criteria => {
        if (criteria.Age && !Array.isArray(criteria.Age)) {
          basicFilterCards.push({
            configPath: 'patient.attributes.Age',
            instanceID: 'patient.attributes.Age',
            type: 'Attribute',
            constraints: {
              content:
                criteria.Age.Op && criteria.Age.Value
                  ? [
                      {
                        type: 'Expression',
                        operator: OPERATORS[criteria.Age.Op],
                        value: criteria.Age.Value,
                      },
                    ]
                  : [],
              type: 'BooleanContainer',
              op: 'OR',
            },
          })
        }

        if (criteria.Gender && Array.isArray(criteria.Gender)) {
          criteria.Gender.forEach(gender => {
            basicFilterCards.push({
              configPath: 'patient.attributes.Gender_concept_name',
              instanceID: 'patient.attributes.Gender_concept_name',
              type: 'Attribute',
              constraints: {
                content: [
                  {
                    type: 'Expression',
                    operator: '=',
                    value: gender.CONCEPT_NAME,
                  },
                ],
                type: 'BooleanContainer',
                op: 'OR',
              },
            })
          })
        }
      })
    })

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

  const getConfigPath = (cohortDefinitionKey: string) => {
    const path = _.findKey(backendConfig.config.patient.interactions, value => {
      return value.cohortDefinitionKey === cohortDefinitionKey
    })
    return path ? `patient.interactions.${path}` : 'patient.interactions.default'
  }

  const getConceptNameConfigPath = (cohortDefinitionKey: string) => {
    const parentPath = getConfigPath(cohortDefinitionKey)
    const searchPath = `${parentPath}.attributes`
    const searchString = 'concept_name'
    const attributes = _.get(backendConfig, searchPath)
    const attributeKey = _.findKey(attributes, (_, key) => key.toLowerCase().includes(searchString))
    return `${searchPath}.${attributeKey}`
  }

  const getFilterCardName = (cohortDefinitionKey: string) => {
    const configPath = getConfigPath(cohortDefinitionKey)
    return backendConfig.config[configPath].name
  }

  const createFilterCards = () => {
    const filterCards = []

    rulesWithoutDemographics.forEach((rule, index) => {
      const criteriaList = rule.expression.CriteriaList
      let currentInstanceNumber = index + 1

      const currentFilterCard = criteriaList.map(criteria => {
        const cohortDefinitionKey = Object.keys(criteria.Criteria)[0]
        const filterCard = {
          configPath: getConfigPath(cohortDefinitionKey),
          instanceNumber: currentInstanceNumber,
          instanceID: `${getConfigPath(cohortDefinitionKey)}.${currentInstanceNumber}`,
          name: getFilterCardName(cohortDefinitionKey),
          inactive: false,
          isEntry: false,
          isExit: false,
          type: 'FilterCard',
          attributes: {
            content: criteriaList.map((criteria, index) => {
              const attributeName = Object.keys(criteria.Criteria)[index]

              if (criteria.Criteria[attributeName]['CodesetId']) {
                const conceptSet = conceptSets.find(
                  conceptSet => conceptSet.id === criteria.Criteria[attributeName]['CodesetId']
                )

                const conceptName = conceptSet.expression.items[0].concept.CONCEPT_NAME

                return {
                  configPath: getConceptNameConfigPath(cohortDefinitionKey),
                  instanceID: `${getConceptNameConfigPath(cohortDefinitionKey)}.${currentInstanceNumber}`,
                  type: 'Attribute',
                  constraints: {
                    content: [
                      {
                        type: 'Expression',
                        operator: '=',
                        value: conceptName,
                      },
                    ],
                    type: 'BooleanContainer',
                    op: 'OR',
                  },
                }
              }
            }),
            type: 'BooleanContainer',
            op: 'AND',
          },
          advanceTimeFilter: null,
        }
        return filterCard
      })

      const returnValue = { content: currentFilterCard, type: 'BooleanContainer', op: 'OR' }
      filterCards.push(returnValue)
    })
    return filterCards
  }
  const basicFilters = createBasicDataFilterCard()
  const filterCards = createFilterCards()
  const allFilterCards = [...basicFilters, ...filterCards]

  return {
    filter: {
      configMetadata: {
        id: '', // Change to config ID
        version: '', // Change to config version
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
    datasetId: '', // Add dataset ID here
  }
}

