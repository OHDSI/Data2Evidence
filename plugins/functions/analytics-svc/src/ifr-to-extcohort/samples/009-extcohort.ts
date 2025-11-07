export default {
    ConceptSets: [
        {
            id: 0,
            name: "Oxygen",
            expression: {
                items: [
                    {
                        concept: {
                            CONCEPT_CLASS_ID: "Ingredient",
                            CONCEPT_CODE: "7806",
                            CONCEPT_ID: 19025274,
                            CONCEPT_NAME: "oxygen",
                            DOMAIN_ID: "Drug",
                            INVALID_REASON: "V",
                            INVALID_REASON_CAPTION: "Valid",
                            STANDARD_CONCEPT: "S",
                            STANDARD_CONCEPT_CAPTION: "Standard",
                            VOCABULARY_ID: "RxNorm",
                            VALID_START_DATE: "1970-01-01",
                            VALID_END_DATE: "2099-12-31",
                        },
                        includeDescendants: false,
                        includeMapped: false,
                    },
                ],
            },
        },
    ],
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
                            Type: 0,
                            Count: 0,
                        },
                    },
                ],
                DemographicCriteriaList: [],
                Groups: [],
            },
        },
        {
            name: "Inclusion Criteria 2",
            expression: {
                Type: "ANY",
                CriteriaList: [
                    {
                        Criteria: {
                            DrugEra: {
                                CodesetId: 0,
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
        CollapseType: "ERA",
        EraPad: 0,
    },
    CensorWindow: {},
    cdmVersionRange: ">=5.0.0",
};
