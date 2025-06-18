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
      name: 'Criteria 1',
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
        Type: 'ALL',
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
  CensoringCriteria: [],
  CollapseSettings: {
    CollapseType: 'ERA',
    EraPad: 0,
  },
  CensorWindow: {},
}
