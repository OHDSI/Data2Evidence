export type ExtCohortDefinition = {
    ConceptSets: ExtCohortConceptSet[];
    PrimaryCriteria: {
        CriteriaList: CriteriaList[];
        ObservationWindow: {
            PriorDays: number;
            PostDays: number;
        };
        PrimaryCriteriaLimit: {
            Type: string;
        };
    };
    QualifiedLimit: {
        Type: string;
    };
    ExpressionLimit: {
        Type: string;
    };
    InclusionRules: InclusionRules[];
    CensoringCriteria: any[];
    CollapseSettings: {
        CollapseType: string;
        EraPad: number;
    };
    CensorWindow: {};
    cdmVersionRange: string;
};

export type ExtCohortConceptSet = {
    id: number;
    name: string;
    expression: {
        items: {
            concept: ExtCohortConcept;
            includeDescendants?: boolean;
            includeMapped?: boolean;
        }[];
    };
};

export type ExtCohortConcept = {
    CONCEPT_CLASS_ID: string;
    CONCEPT_CODE: string;
    CONCEPT_ID: number;
    CONCEPT_NAME: string;
    DOMAIN_ID: string;
    INVALID_REASON: string;
    INVALID_REASON_CAPTION: string;
    STANDARD_CONCEPT: string;
    STANDARD_CONCEPT_CAPTION: string;
    VOCABULARY_ID: string;
    VALID_START_DATE: string;
    VALID_END_DATE: string;
    USEDESCENDANTS?: boolean;
    USEMAPPED?: boolean;
};

export type InclusionRules = {
    name: string;
    expression: {
        Type: string;
        CriteriaList: CriteriaList[];
        DemographicCriteriaList:
            | {
                  [key: string]: Criteria;
              }[];
        Groups: never[];
    };
};

export type CriteriaList = {
    [key: string]: {
        CodesetId?: number;
        [key: string]: any;
    };
};

export type Criteria =
    | {
          Value: number | string;
          Op: string;
      }
    | { [key: string]: string | number }[];
