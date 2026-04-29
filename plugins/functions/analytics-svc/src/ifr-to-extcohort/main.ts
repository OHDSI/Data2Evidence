import {
    CdmConfig,
    IFRDefinition,
    IFRFilterCard,
    ExtCohortDefinition,
} from "./types";
import {
    convertEventAttributesToConceptSets,
    createCriteriaList,
    createDemographicCriteriaList,
    createInclusionRules,
} from "./cdmConfigUtils";
import { IMRIRequest } from "../types";

export const convertIFRToExtCohort = async (
    ifrDefinition: IFRDefinition,
    cdmConfig: CdmConfig,
    req: IMRIRequest,
    datasetId: string
): Promise<ExtCohortDefinition> => {
    const conceptSets = await convertEventAttributesToConceptSets(
        cdmConfig,
        ifrDefinition.filter.cards.content,
        req,
        datasetId
    );
    const demography = ifrDefinition.filter.cards.content.shift() as
        | IFRFilterCard
        | undefined;
    const demographicCriteriaList = await createDemographicCriteriaList(
        demography,
        cdmConfig,
        req,
        datasetId
    );
    const criteriaList = await createCriteriaList(
        cdmConfig,
        ifrDefinition,
        conceptSets,
        req,
        datasetId
    );
    return {
        ConceptSets: conceptSets,
        PrimaryCriteria: {
            CriteriaList: [
                // Entry event to capture all patients
                // This cannot be empty for ATLAS
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
        InclusionRules: createInclusionRules(
            demographicCriteriaList,
            criteriaList
        ),
        CensoringCriteria: [],
        CollapseSettings: {
            CollapseType: "ERA",
            EraPad: 0,
        },
        CensorWindow: {},
        cdmVersionRange: ">=5.0.0",
    };
};
