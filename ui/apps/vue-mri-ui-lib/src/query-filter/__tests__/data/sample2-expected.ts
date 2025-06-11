export default {
  ConceptSets: [],
  PrimaryCriteria: {
    CriteriaList: [],
    ObservationWindow: {
      PriorDays: 0,
      PostDays: 0,
    },
    PrimaryCriteriaLimit: {
      Type: 'All',
    },
  },
  QualifiedLimit: {
    Type: 'All',
  },
  ExpressionLimit: {
    Type: 'All',
  },
  InclusionRules: [
    {
      name: 'Condition Occurrence',
      expression: {
        Type: 'ALL',
        CriteriaList: [
          {
            Criteria: {
              ConditionOccurrence: {},
            },
            StartWindow: {
              Start: {
                Coeff: -1,
              },
              End: {
                Coeff: 1,
              },
              UseEventEnd: false,
            },
            Occurrence: {
              Type: 2,
              Count: 1,
            },
          },
        ],
        DemographicCriteriaList: [],
        Groups: [],
      },
    },
    {
      name: 'Condition Occurrence',
      expression: {
        Type: 'ALL',
        CriteriaList: [
          {
            Criteria: {
              ConditionOccurrence: {},
            },
            StartWindow: {
              Start: {
                Coeff: -1,
              },
              End: {
                Coeff: 1,
              },
              UseEventEnd: false,
            },
            Occurrence: {
              Type: 2,
              Count: 1,
            },
          },
        ],
        DemographicCriteriaList: [],
        Groups: [],
      },
    },
  ],
  CensoringCriteria: [],
  CollapseSettings: {
    CollapseType: 'ERA',
    EraPad: 0,
  },
  CensorWindow: {},
}

