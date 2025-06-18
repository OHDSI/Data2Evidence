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
      name: 'Group 1',
      description: 'Description 1',
      expression: {
        Type: 'ALL',
        CriteriaList: [
          {
            Criteria: {
              ConditionOccurrence: {
                CorrelatedCriteria: {
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
                        Type: 2, // options: 0: exactly, 1: at most, 2: at least
                        Count: 1,
                      },
                    },
                  ],
                  DemographicCriteriaList: [],
                  Groups: [],
                },
              },
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
              Type: 2, // options: 0: exactly, 1: at most, 2: at least
              Count: 1,
            },
          },
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
              Type: 2, // options: 0: exactly, 1: at most, 2: at least
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

