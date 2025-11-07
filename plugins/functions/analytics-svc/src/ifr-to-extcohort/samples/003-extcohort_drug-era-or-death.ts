export default {
    ConceptSets: [],
    PrimaryCriteria: {
        CriteriaList: [
            {
                ObservationPeriod: {
                    PeriodStartDate: {
                        Value: "1800-01-01",
                        Op: "gt",
                    },
                    PeriodEndDate: {
                        Value: "2999-01-01",
                        Op: "lt",
                    },
                },
            },
        ],
        ObservationWindow: {
            PriorDays: 0,
            PostDays: 0,
        },
        PrimaryCriteriaLimit: {
            Type: "First",
        },
    },
    QualifiedLimit: {
        Type: "First",
    },
    ExpressionLimit: {
        Type: "First",
    },
    InclusionRules: [
        {
            name: "Inclusion Criteria 1",
            expression: {
                Type: "ANY",
                CriteriaList: [
                    {
                        Criteria: {
                            DrugEra: {},
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
                            Death: {},
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
        CollapseType: "ERA",
        EraPad: 0,
    },
    CensorWindow: {},
    cdmVersionRange: ">=5.0.0",
};
