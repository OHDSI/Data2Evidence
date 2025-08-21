import { IWebapiConcept, Concept, FhirConceptMapElementTarget, IWebapiConceptRelated } from "./types";

export const mapd2eWebapiConcepts = (concept: IWebapiConcept): Concept => {
  return {
    conceptId: concept.CONCEPT_ID,
    display: concept.CONCEPT_NAME,
    domainId: concept.DOMAIN_ID,
    system: concept.VOCABULARY_ID,
    conceptClassId: concept.CONCEPT_CLASS_ID,
    standardConcept: concept.STANDARD_CONCEPT as string,
    concept: concept.STANDARD_CONCEPT_CAPTION,
    code: concept.CONCEPT_CODE,
    validStartDate: new Date(concept.VALID_START_DATE).toLocaleDateString(),
    validEndDate: new Date(concept.VALID_END_DATE).toLocaleDateString(),
    validity: concept.INVALID_REASON_CAPTION,
    score: concept.SCORE,
  };
};

// TODO: Discuss implementation
export const mapd2eWebapiConceptDetails = (conceptsRelated: IWebapiConceptRelated[]): FhirConceptMapElementTarget[] => {
  return conceptsRelated.reduce((acc, conceptRelated) => {
    acc = acc.concat(_reduceConceptRelated(conceptRelated));
    return acc;
  }, [] as FhirConceptMapElementTarget[]);
};

// TODO: Discuss implementation
const _reduceConceptRelated = (conceptRelated: IWebapiConceptRelated): FhirConceptMapElementTarget[] => {
  return conceptRelated.RELATIONSHIPS.reduce((acc, conceptRelatedRelationship) => {
    if (conceptRelatedRelationship.RELATIONSHIP_DISTANCE === 1 && conceptRelated.STANDARD_CONCEPT === "S") {
      acc.push({
        code: conceptRelated.CONCEPT_ID,
        display: conceptRelated.CONCEPT_NAME,
        vocabularyId: conceptRelated.VOCABULARY_ID,
        equivalence: conceptRelatedRelationship.RELATIONSHIP_NAME,
      });
    }
    return acc;
  }, [] as FhirConceptMapElementTarget[]);
};
