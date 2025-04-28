import { CdmConfig, IFRDefinition, IFRFilterCard, ExtCohortDefinition } from './IfrToExtCohortDeps/types'
import {
  convertEventAttributesToConceptSets,
  createCriteriaList,
  createDemographicCriteriaList,
  createInclusionRules,
} from './IfrToExtCohortDeps/cdmConfigUtils'
import { api } from './IfrToExtCohortDeps/api'

export const convertIFRToExtCohort = async (
  ifrDefinition: IFRDefinition,
  datasetId: string
): Promise<ExtCohortDefinition> => {
  const backendConfig = await api.portalServer.getBackendConfig(datasetId)
  const cdmConfig: CdmConfig = backendConfig.config
  const conceptSets = await convertEventAttributesToConceptSets(
    cdmConfig,
    ifrDefinition.filter.cards.content,
    datasetId
  )
  const demography = ifrDefinition.filter.cards.content.shift() as IFRFilterCard | undefined
  const demographicCriteriaList = await createDemographicCriteriaList(demography, cdmConfig, datasetId)
  const criteriaList = await createCriteriaList(cdmConfig, ifrDefinition, conceptSets, datasetId)
  return {
    ConceptSets: conceptSets,
    PrimaryCriteria: {
      CriteriaList: [
        // Entry event to capture all patients
        // This cannot be empty for ATLAS
        {
          ObservationPeriod: {
            PeriodStartDate: {
              Value: '1800-01-01',
              Op: 'gt',
            },
            PeriodEndDate: {
              Value: '2999-01-01',
              Op: 'lt',
            },
          },
        },
      ],
      ObservationWindow: {
        PriorDays: 0,
        PostDays: 0,
      },
      PrimaryCriteriaLimit: {
        Type: 'First',
      },
    },
    QualifiedLimit: {
      Type: 'First',
    },
    ExpressionLimit: {
      Type: 'First',
    },
    InclusionRules: createInclusionRules(demographicCriteriaList, criteriaList),
    CensoringCriteria: [],
    CollapseSettings: {
      CollapseType: 'ERA',
      EraPad: 0,
    },
    CensorWindow: {},
    cdmVersionRange: '>=5.0.0',
  }
}
