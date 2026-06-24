import _ from "lodash";
import { ExtCohortConcept } from "./types";
import { terminologyRequest } from "../utils/TerminologySvcProxy";
import { d2eWebapiRequest } from "../utils/D2eWebapiProxy";
import { IMRIRequest } from "../types";
import { parseConceptSetRef, formatConceptSetRef } from "../utils/conceptSetRef";

function upperCaseKeys(obj: ExtCohortConcept): ExtCohortConcept {
    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const upperKey = key.toUpperCase() as keyof ExtCohortConcept; // Convert the key to uppercase
            result[upperKey as keyof ExtCohortConcept] =
                obj[key as keyof ExtCohortConcept];
        }
    }
    return result as ExtCohortConcept;
}

export const getConceptByName = async ({
    conceptName,
    req,
    datasetId,
}: {
    conceptName: string;
    req: IMRIRequest;
    datasetId: string;
}): Promise<ExtCohortConcept | null> => {
    const concept = await terminologyRequest(
        req,
        "POST",
        `concept/searchByName`,
        { conceptName, datasetId }
    );

    return concept[0] ? upperCaseKeys(concept[0]) : null;
};

export const getConceptById = async ({
    conceptId,
    req,
    datasetId,
}: {
    conceptId: number;
    req: IMRIRequest;
    datasetId: string;
}): Promise<ExtCohortConcept | null> => {
    const concept = await terminologyRequest(
        req,
        "POST",
        `concept/searchById`,
        { conceptId, datasetId }
    );

    return concept[0] ? upperCaseKeys(concept[0]) : null;
};

export const getConceptByCode = async ({
    conceptCode,
    req,
    datasetId,
}: {
    conceptCode: string;
    req: IMRIRequest;
    datasetId: string;
}): Promise<ExtCohortConcept | null> => {
    const concept = await terminologyRequest(
        req,
        "POST",
        `concept/searchByCode`,
        { conceptCode, datasetId }
    );

    return concept[0] ? upperCaseKeys(concept[0]) : null;
};

export const getConceptsFromConceptSet = async ({
    conceptSetId,
    req,
    datasetId,
}: {
    conceptSetId: string;
    req: IMRIRequest;
    datasetId: string;
}): Promise<ExtCohortConcept[] | null> => {
    const ref = parseConceptSetRef(conceptSetId);
    if (ref.source === "webapi") {
        const concepts = await d2eWebapiRequest(
            req,
            "POST",
            `conceptset/included-concepts`,
            { conceptSetIds: [formatConceptSetRef(ref)], datasetId },
            datasetId
        );

        return concepts.length
            ? concepts.map((concept: any) => ({
                  CONCEPT_ID: concept.CONCEPT_ID,
                  CONCEPT_NAME: concept.CONCEPT_NAME,
                  DOMAIN_ID: concept.DOMAIN_ID,
                  VOCABULARY_ID: concept.VOCABULARY_ID,
                  CONCEPT_CLASS_ID: concept.CONCEPT_CLASS_ID,
                  STANDARD_CONCEPT: concept.STANDARD_CONCEPT,
                  CONCEPT_CODE: concept.CONCEPT_CODE,
                  VALID_START_DATE: concept.VALID_START_DATE,
                  VALID_END_DATE: concept.VALID_END_DATE,
                  INVALID_REASON: concept.INVALID_REASON,
                  USEMAPPED: concept.USEMAPPED,
                  USEDESCENDANTS: concept.USEDESCENDANTS,
              }))
            : null;
    }
    const { concepts } = await terminologyRequest(
        req,
        "GET",
        `concept-set/${ref.externalId}?datasetId=${datasetId}`,
        null
    );

    return concepts.length
        ? concepts
              .map((concept) => upperCaseKeys(concept))
              .map((concept) => {
                  return {
                      CONCEPT_ID: concept.CONCEPTID,
                      CONCEPT_NAME: concept.DISPLAY,
                      DOMAIN_ID: concept.DOMAINID,
                      VOCABULARY_ID: concept.SYSTEM,
                      CONCEPT_CLASS_ID: concept.CONCEPTCLASSID,
                      STANDARD_CONCEPT: concept.STANDARDCONCEPT,
                      CONCEPT_CODE: concept.CODE,
                      VALID_START_DATE: concept.VALIDSTARTDATE,
                      VALID_END_DATE: concept.VALIDENDDATE,
                      INVALID_REASON: concept.VALIDITY,
                      USEMAPPED: concept.USEMAPPED,
                      USEDESCENDANTS: concept.USEDESCENDANTS,
                  };
              })
        : null;
};
