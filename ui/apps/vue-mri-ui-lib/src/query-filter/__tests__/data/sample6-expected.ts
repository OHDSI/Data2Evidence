export default {
  ConceptSets: [],
  PrimaryCriteria: {
    CriteriaList: [],
    ObservationWindow: {
      PriorDays: 0,
      PostDays: 0,
    },
    PrimaryCriteriaLimit: {
      Type: 'All' as const,
    },
  },
  QualifiedLimit: {
    Type: 'All' as const,
  },
  ExpressionLimit: {
    Type: 'All' as const,
  },
  InclusionRules: [
    {
      name: 'Criteria 1',
      description: 'Description 1',
      expression: {
        Type: 'ALL' as const,
        CriteriaList: [
          {
            Criteria: {
              ConditionOccurrence: {
                CorrelatedCriteria: {
                  Type: 'ALL' as const,
                  CriteriaList: [
                    {
                      Criteria: {
                        ConditionOccurrence: {
                          CorrelatedCriteria: {
                            Type: 'ALL' as const,
                            CriteriaList: [
                              {
                                Criteria: {
                                  ConditionOccurrence: {
                                    CorrelatedCriteria: {
                                      Type: 'ALL' as const,
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
              CountColumn: 'START_DATE',
            },
          },
          {
            Criteria: {
              ConditionOccurrence: {
                CorrelatedCriteria: {
                  Type: 'ALL' as const,
                  CriteriaList: [
                    {
                      Criteria: {
                        ConditionOccurrence: {
                          Age: {
                            Value: 5,
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
              CountColumn: 'START_DATE',
            },
          },
        ],
        DemographicCriteriaList: [],
        Groups: [],
      },
    },
    {
      name: 'Criteria 2',
      description: 'Description 2',
      expression: {
        Type: 'ALL' as const,
        CriteriaList: [],
        DemographicCriteriaList: [
          {
            Age: {
              Value: 7,
              Op: 'gt',
            },
          },
        ],
        Groups: [],
      },
    },
  ],
  EndStrategy: {},
  CensoringCriteria: [],
  CollapseSettings: {
    CollapseType: 'ERA' as const,
    EraPad: 0,
  },
  CensorWindow: {},
}
