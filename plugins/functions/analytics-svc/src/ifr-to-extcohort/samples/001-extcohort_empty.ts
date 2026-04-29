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
    InclusionRules: [],
    CensoringCriteria: [],
    CollapseSettings: {
        CollapseType: "ERA",
        EraPad: 0,
    },
    CensorWindow: {},
    cdmVersionRange: ">=5.0.0",
};
