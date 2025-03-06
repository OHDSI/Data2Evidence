import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ConceptSetDto,
  ConceptSetCheckDto,
  ConceptSetCheckResponseDto,
  ConceptSetListResponseDto,
  ConceptSetResponseDto,
  ConceptSetItemListDto,
  ConceptSetItemsResponseDto,
} from "../dto/conceptset.ts";

import {
  getConceptSets,
  checkIfConceptSetExists,
} from "../services/conceptset.service.ts";

// deno-lint-ignore require-await
export const conceptset: FastifyPluginAsyncZod = async function (app) {
  app.get(
    "/",
    {
      schema: {
        description: "Get the full list of concept sets in the database",
        tags: ["conceptset"],
        response: { 200: ConceptSetListResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const results = await getConceptSets(req.token, req.datasetId);
      res.send(results);
    }
  );

  app.post(
    "/",
    {
      schema: {
        description: "Save a new concept set to the database",
        body: ConceptSetDto,
        tags: ["conceptset"],
        response: { 200: ConceptSetResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    (_req, res) => {
      // TODO: ADD LOGIC
      const dummyresponse = {
        createdDate: 1738548790447,
        modifiedDate: 1738548790447,
        hasWriteAccess: false,
        hasReadAccess: false,
        id: 1885989,
        name: "2025_allergicasthma",
      };
      res.send(dummyresponse);
    }
  );

  app.post(
    "/check",
    {
      schema: {
        description:
          "Checks a concept set for diagnostic problems. At this time, this appears to be an endpoint used to check to see which tags are applied to a concept set.",
        tags: ["conceptset"],
        body: ConceptSetCheckDto,
        response: { 200: ConceptSetCheckResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    (_req, res) => {
      // TODO: ADD LOGIC
      const dummyresponse = { warnings: [] };
      res.send(dummyresponse);
    }
  );

  app.get(
    "/:id/exists",
    {
      schema: {
        description:
          "Check if a concept set with the same name exists in the WebAPIdatabase. The name is checked against the selected concept set IDto ensure that only the selected concept set ID has the name specified.",
        tags: ["conceptset"],
        params: z.object({ id: z.coerce.number() }),
        querystring: z.object({ name: z.string() }),
        response: { 200: z.number() },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const { id } = req.params;
      const { name } = req.query;
      const result = await checkIfConceptSetExists(
        req.token,
        req.datasetId,
        id,
        name
      );
      res.send(result);
    }
  );

  app.get(
    "/:id/expression",
    {
      schema: {
        description: "Get the concept set expression by identifier",
        tags: ["conceptset"],
        params: z.object({ id: z.coerce.number() }),
        response: { 200: ConceptSetItemsResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    (_req, res) => {
      // TODO: ADD LOGIC
      const dummyreponse = {
        items: [
          {
            concept: {
              CONCEPT_ID: 4191479,
              CONCEPT_NAME: "Allergic asthma",
              STANDARD_CONCEPT: "S",
              STANDARD_CONCEPT_CAPTION: "Standard",
              INVALID_REASON: "V",
              INVALID_REASON_CAPTION: "Valid",
              CONCEPT_CODE: "389145006",
              DOMAIN_ID: "Condition",
              VOCABULARY_ID: "SNOMED",
              CONCEPT_CLASS_ID: "Disorder",
              VALID_START_DATE: 1043971200000,
              VALID_END_DATE: 4102358400000,
            },
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false,
          },
          {
            concept: {
              CONCEPT_ID: 4211530,
              CONCEPT_NAME: "Asthma caused by wood dust",
              STANDARD_CONCEPT: "S",
              STANDARD_CONCEPT_CAPTION: "Standard",
              INVALID_REASON: "V",
              INVALID_REASON_CAPTION: "Valid",
              CONCEPT_CODE: "56968009",
              DOMAIN_ID: "Condition",
              VOCABULARY_ID: "SNOMED",
              CONCEPT_CLASS_ID: "Disorder",
              VALID_START_DATE: 1012435200000,
              VALID_END_DATE: 4102358400000,
            },
            isExcluded: true,
            includeDescendants: true,
            includeMapped: false,
          },
        ],
      };
      res.send(dummyreponse);
    }
  );

  app.put(
    "/:id/items",
    {
      schema: {
        description:
          "Update the concept set items for the selected concept set ID in the database.",
        tags: ["conceptset"],
        params: z.object({ id: z.coerce.number() }),
        body: ConceptSetItemListDto,
        response: { 200: z.boolean() },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    (_req, res) => {
      // TODO: ADD LOGIC
      res.send(true);
    }
  );
};
