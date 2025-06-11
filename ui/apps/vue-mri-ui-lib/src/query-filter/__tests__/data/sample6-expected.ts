export default {
  ConceptSets: [],
  PrimaryCriteria: {
    CriteriaList: [
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
              ConditionOccurrence: {
                CorrelatedCriteria: {
                  Type: 'ALL',
                  CriteriaList: [
                    {
                      Criteria: {
                        ConditionOccurrence: {
                          Age: {
                            Op: 'gt',
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
                        Type: 2,
                        Count: 1,
                      },
                    },
                  ],
                  DemographicCriteriaList: [],
                  Groups: [],
                },
                Age: {
                  Op: 'gt',
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
  cdmVersionRange: '>=5.0.0',
}
