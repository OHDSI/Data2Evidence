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
                Type: "ALL",
                CriteriaList: [],
                DemographicCriteriaList: [
                    {
                        Age: {
                            Value: 50,
                            Op: "gt",
                        },
                        Gender: [
                            {
                                CONCEPT_CODE: "M",
                                CONCEPT_ID: 8507,
                                CONCEPT_NAME: "MALE",
                                DOMAIN_ID: "Gender",
                                VOCABULARY_ID: "Gender",
                            },
                        ],
                    },
                ],
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
