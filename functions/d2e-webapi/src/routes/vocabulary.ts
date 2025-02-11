import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ConceptResponseDto,
  ConceptListResponseDto,
  ConceptSetExpressionDto,
  LookupIdentifierAncestorsDto,
  LookupIdentifierAncestorsResponseDto,
  ConceptRecommendedListResponseDto,
  DomainsResponseDto,
  VocabulariesResponseDto,
} from "../dto/vocabulary.ts";

// deno-lint-ignore require-await
export const vocabulary: FastifyPluginAsyncZod = async function (app) {
  app.post(
    "/:sourceKey/resolveConceptSetExpression",
    {
      schema: {
        description:
          "Resolve a concept set expression into a collection of concept identifiers using the selected vocabulary source. ",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        body: ConceptSetExpressionDto,
        response: { 200: z.array(z.number()) },
      },
    },
    (req, res) => {
      console.log(req.body.items);
      const { sourceKey } = req.params;
      console.log(sourceKey);
      // TODO: ADD  LOGIC
      const dummyreponse = [4207489, 36031722, 36032283];

      res.send(dummyreponse);
    }
  );

  app.post(
    "/:sourceKey/included-concepts/count",
    {
      schema: {
        description:
          "Resolve a concept set expression to get the count of included concepts using the selected vocabulary source. ",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        body: ConceptSetExpressionDto,
        response: { 200: z.number() },
      },
    },
    (req, res) => {
      console.log(req.body.items);
      const { sourceKey } = req.params;
      console.log(sourceKey);
      // TODO: ADD  LOGIC

      res.send(3);
    }
  );

  app.post(
    "/:sourceKey/lookup/identifiers",
    {
      schema: {
        description:
          "Get concepts from concept identifiers (IDs) from a specific source",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        body: z.array(z.number()),
        response: { 200: ConceptListResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse = [
        {
          CONCEPT_ID: 44793001,
          CONCEPT_NAME:
            "Hb A1c (Haemoglobin A1c) measurement - IFCC (International Federation of Clinical Chemistry and Laboratory Medicine) standardised",
          STANDARD_CONCEPT: "S",
          STANDARD_CONCEPT_CAPTION: "Standard",
          INVALID_REASON: "V",
          INVALID_REASON_CAPTION: "Valid",
          CONCEPT_CODE: "371981000000106",
          DOMAIN_ID: "Measurement",
          VOCABULARY_ID: "SNOMED",
          CONCEPT_CLASS_ID: "Procedure",
          VALID_START_DATE: 1238544000000,
          VALID_END_DATE: 4102358400000,
        },
        {
          CONCEPT_ID: 4197971,
          CONCEPT_NAME: "HbA1c measurement (DCCT aligned)",
          STANDARD_CONCEPT: "S",
          STANDARD_CONCEPT_CAPTION: "Standard",
          INVALID_REASON: "V",
          INVALID_REASON_CAPTION: "Valid",
          CONCEPT_CODE: "313835008",
          DOMAIN_ID: "Measurement",
          VOCABULARY_ID: "SNOMED",
          CONCEPT_CLASS_ID: "Procedure",
          VALID_START_DATE: 1012435200000,
          VALID_END_DATE: 4102358400000,
        },
        {
          CONCEPT_ID: 3034639,
          CONCEPT_NAME: "Hemoglobin A1c [Mass/volume] in Blood",
          STANDARD_CONCEPT: "S",
          STANDARD_CONCEPT_CAPTION: "Standard",
          INVALID_REASON: "V",
          INVALID_REASON_CAPTION: "Valid",
          CONCEPT_CODE: "41995-2",
          DOMAIN_ID: "Measurement",
          VOCABULARY_ID: "LOINC",
          CONCEPT_CLASS_ID: "Lab Test",
          VALID_START_DATE: 1122595200000,
          VALID_END_DATE: 4102358400000,
        },
      ];

      res.send(dummyresponse);
    }
  );

  app.post(
    "/:sourceKey/lookup/identifiers/ancestors",
    {
      schema: {
        description:
          "Calculates the full set of ancestor and descendant concepts for a list of ancestor and descendant concepts specified. This is used by ATLAS whennavigating the list of included concepts in a concept set - the full listof ancestors (as defined in the concept set) and the descendants (thoseconcepts included when resolving the concept set) are used to determine which descendant concepts share one or more ancestors.",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        body: LookupIdentifierAncestorsDto,
        response: { 200: LookupIdentifierAncestorsResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse = {
        "3034639": [4184637],
        "44793001": [4184637],
        "4197971": [4184637],
        "2212393": [4184637],
        "2106252": [4184637],
        "2106236": [4184637],
        "2106238": [4184637],
      };

      res.send(dummyresponse);
    }
  );

  app.post(
    "/:sourceKey/lookup/mapped",
    {
      schema: {
        description:
          "Get concepts mapped to the selected concept identifiers from a specific source. Find all concepts mapped to the concept identifiers provided. This end-point will check the CONCEPT, CONCEPT_RELATIONSHIP andSOURCE_TO_CONCEPT_MAP tables.",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        body: z.array(z.number()),
        response: { 200: ConceptListResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse = [
        {
          CONCEPT_ID: 3556271,
          CONCEPT_NAME: "HbA1c level (IFCC aligned)",
          STANDARD_CONCEPT: "N",
          STANDARD_CONCEPT_CAPTION: "Non-Standard",
          INVALID_REASON: "U",
          INVALID_REASON_CAPTION: "Invalid",
          CONCEPT_CODE: "371991000000108",
          DOMAIN_ID: "Observation",
          VOCABULARY_ID: "SNOMED",
          CONCEPT_CLASS_ID: "Undefined",
          VALID_START_DATE: 1238544000000,
          VALID_END_DATE: 1238544000000,
        },
        {
          CONCEPT_ID: 3146876,
          CONCEPT_NAME: "HbA1 7-10% - borderline control",
          STANDARD_CONCEPT: "N",
          STANDARD_CONCEPT_CAPTION: "Non-Standard",
          INVALID_REASON: "U",
          INVALID_REASON_CAPTION: "Invalid",
          CONCEPT_CODE: "310311007",
          DOMAIN_ID: "Condition",
          VOCABULARY_ID: "Nebraska Lexicon",
          CONCEPT_CLASS_ID: "Clinical Finding",
          VALID_START_DATE: 1059523200000,
          VALID_END_DATE: 1059609600000,
        },
        {
          CONCEPT_ID: 40307813,
          CONCEPT_NAME: "Hemoglobin A1c level",
          STANDARD_CONCEPT: "N",
          STANDARD_CONCEPT_CAPTION: "Non-Standard",
          INVALID_REASON: "U",
          INVALID_REASON_CAPTION: "Invalid",
          CONCEPT_CODE: "144176003",
          DOMAIN_ID: "Measurement",
          VOCABULARY_ID: "SNOMED",
          CONCEPT_CLASS_ID: "Procedure",
          VALID_START_DATE: 1012435200000,
          VALID_END_DATE: 1012435200000,
        },
      ];

      res.send(dummyresponse);
    }
  );

  app.post(
    "/:sourceKey/lookup/recommended",
    {
      schema: {
        description:
          "Get the recommended concepts for a selected list of concept ids for a selected source key",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        body: z.array(z.number()),
        response: { 200: ConceptRecommendedListResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse = [
        {
          CONCEPT_ID: 3003309,
          CONCEPT_NAME:
            "Hemoglobin A1c/Hemoglobin.total in Blood by Electrophoresis",
          STANDARD_CONCEPT: "S",
          STANDARD_CONCEPT_CAPTION: "Standard",
          INVALID_REASON: "V",
          INVALID_REASON_CAPTION: "Valid",
          CONCEPT_CODE: "4549-2",
          DOMAIN_ID: "Measurement",
          VOCABULARY_ID: "LOINC",
          CONCEPT_CLASS_ID: "Lab Test",
          RELATIONSHIPS: ["Lexical via standard"],
        },
        {
          CONCEPT_ID: 4250176,
          CONCEPT_NAME: "Protein measurement",
          STANDARD_CONCEPT: "S",
          STANDARD_CONCEPT_CAPTION: "Standard",
          INVALID_REASON: "V",
          INVALID_REASON_CAPTION: "Valid",
          CONCEPT_CODE: "74040009",
          DOMAIN_ID: "Measurement",
          VOCABULARY_ID: "SNOMED",
          CONCEPT_CLASS_ID: "Procedure",
          RELATIONSHIPS: ["Ontology-parent"],
        },
        {
          CONCEPT_ID: 4184637,
          CONCEPT_NAME: "Hemoglobin A1c measurement",
          STANDARD_CONCEPT: "S",
          STANDARD_CONCEPT_CAPTION: "Standard",
          INVALID_REASON: "V",
          INVALID_REASON_CAPTION: "Valid",
          CONCEPT_CODE: "43396009",
          DOMAIN_ID: "Measurement",
          VOCABULARY_ID: "SNOMED",
          CONCEPT_CLASS_ID: "Procedure",
          RELATIONSHIPS: ["Lexical via standard", "Ontology-parent"],
        },
      ];

      res.send(dummyresponse);
    }
  );

  app.get(
    "/:sourceKey/domains",
    {
      schema: {
        description:
          "Get a collection of domains from the domain table in the vocabulary for the the selected source key.",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        response: { 200: DomainsResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse = [
        {
          DOMAIN_NAME: "Condition",
          DOMAIN_ID: "Condition",
          DOMAIN_CONCEPT_ID: 19,
        },
        {
          DOMAIN_NAME: "Condition/Device",
          DOMAIN_ID: "Condition/Device",
          DOMAIN_CONCEPT_ID: 235,
        },
        {
          DOMAIN_NAME: "Condition/Drug",
          DOMAIN_ID: "Condition/Drug",
          DOMAIN_CONCEPT_ID: 53,
        },
      ];

      res.send(dummyresponse);
    }
  );

  app.get(
    "/:sourceKey/vocabularies",
    {
      schema: {
        description:
          "Get a collection of vocabularies from the vocabulary table in the selected source key.",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        response: { 200: VocabulariesResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse = [
        {
          VOCABULARY_ID: "APC",
          VOCABULARY_NAME: "Ambulatory Payment Classification (CMS)",
          VOCABULARY_REFERENCE:
            "http://www.cms.gov/Medicare/Medicare-Fee-for-Service-Payment/HospitalOutpatientPPS/Hospital-Outpatient-Regulations-and-Notices.html",
          VOCABULARY_VERSION: "2018-January-Addendum-A",
          VOCABULARY_CONCEPT_ID: 44819132,
        },
        {
          VOCABULARY_ID: "EphMRA ATC",
          VOCABULARY_NAME:
            "Anatomical Classification of Pharmaceutical Products (EphMRA)",
          VOCABULARY_REFERENCE:
            "http://www.ephmra.org/Anatomical-Classification",
          VOCABULARY_VERSION: "EphMRA ATC 2016",
          VOCABULARY_CONCEPT_ID: 243,
        },
        {
          VOCABULARY_ID: "CVX",
          VOCABULARY_NAME: "CDC Vaccine Administered CVX (NCIRD)",
          VOCABULARY_REFERENCE:
            "https://www2a.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx",
          VOCABULARY_VERSION: "CVX 20231214",
          VOCABULARY_CONCEPT_ID: 581400,
        },
      ];

      res.send(dummyresponse);
    }
  );

  app.get(
    "/:sourceKey/concept/:id",
    {
      schema: {
        description:
          "Get a concept based on the concept identifier from the specified source",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string(), id: z.number() }),
        response: { 200: ConceptResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse = {
        CONCEPT_ID: 45445153,
        CONCEPT_NAME: "Antigen test",
        STANDARD_CONCEPT: "N",
        STANDARD_CONCEPT_CAPTION: "Non-Standard",
        INVALID_REASON: "V",
        INVALID_REASON_CAPTION: "Valid",
        CONCEPT_CODE: "43Z9.00",
        DOMAIN_ID: "Measurement",
        VOCABULARY_ID: "Read",
        CONCEPT_CLASS_ID: "Read",
        VALID_START_DATE: 0,
        VALID_END_DATE: 4102358400000,
      };

      res.send(dummyresponse);
    }
  );

  app.get(
    "/search",
    {
      schema: {
        description:
          "Search for a concept based on a query using the default vocabulary source. NOTE: This method uses the query as part of the URL query string",
        tags: ["vocabulary"],
        querystring: z.object({ search: z.string() }),
        response: { 200: ConceptListResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse = [
        {
          CONCEPT_ID: 3037958,
          CONCEPT_NAME:
            "Deprecated Testosterone.bioavailable+Free/Testosterone.total in Serum or Plasma",
          STANDARD_CONCEPT: "N",
          STANDARD_CONCEPT_CAPTION: "Non-Standard",
          INVALID_REASON: "U",
          INVALID_REASON_CAPTION: "Invalid",
          CONCEPT_CODE: "41869-9",
          DOMAIN_ID: "Measurement",
          VOCABULARY_ID: "LOINC",
          CONCEPT_CLASS_ID: "Lab Test",
          VALID_START_DATE: 1427155200000,
          VALID_END_DATE: 1427241600000,
        },
        {
          CONCEPT_ID: 1019874,
          CONCEPT_NAME: "Testosterone.bioavailable+Free/Testosterone.total",
          STANDARD_CONCEPT: "N",
          STANDARD_CONCEPT_CAPTION: "Non-Standard",
          INVALID_REASON: "V",
          INVALID_REASON_CAPTION: "Valid",
          CONCEPT_CODE: "LP287194-7",
          DOMAIN_ID: "Observation",
          VOCABULARY_ID: "LOINC",
          CONCEPT_CLASS_ID: "LOINC Component",
          VALID_START_DATE: 0,
          VALID_END_DATE: 4102358400000,
        },
        {
          CONCEPT_ID: 3023837,
          CONCEPT_NAME:
            "Testosterone.free+weakly bound/Testosterone.total in Serum or Plasma",
          STANDARD_CONCEPT: "S",
          STANDARD_CONCEPT_CAPTION: "Standard",
          INVALID_REASON: "V",
          INVALID_REASON_CAPTION: "Valid",
          CONCEPT_CODE: "6891-6",
          DOMAIN_ID: "Measurement",
          VOCABULARY_ID: "LOINC",
          CONCEPT_CLASS_ID: "Lab Test",
          VALID_START_DATE: 0,
          VALID_END_DATE: 4102358400000,
        },
      ];

      res.send(dummyresponse);
    }
  );
};
