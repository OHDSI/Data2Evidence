export default {
  ConceptSets: [],
  PrimaryCriteria: {
    CriteriaList: [],
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
                          CorrelatedCriteria: {
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
                                              Gender: [],
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
        CriteriaList: [],
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
