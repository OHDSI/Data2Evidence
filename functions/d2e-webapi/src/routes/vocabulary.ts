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
  VocabularySourceInfo,
  ConceptRelatedResponseDto,
  ConceptListDto,
} from "../dto/vocabulary.ts";
import {
  getIncludedConceptsCount,
  resolveConceptSetExpression,
  getConceptsFromIdentifiers,
  getAncestorsFromIdentifiers,
  getVocabularySourceInfo,
  searchConcept,
  getConceptById,
  getRecommendedConceptsFromIdentifiers,
  getMappedConcepts,
  getDomains,
  getVocabularies,
  getRelatedConceptsFromIdentifier,
} from "../services/vocabulary.service.ts";

// deno-lint-ignore require-await
export const vocabulary: FastifyPluginAsyncZod = async function (app) {
  app.get(
    "/:sourceKey/info",
    {
      schema: {
        description: "Get the vocabulary version using the dataset id",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        response: { 200: VocabularySourceInfo },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getVocabularySourceInfo(req.token, req.datasetId);
      res.send(result);
    }
  );

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
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await resolveConceptSetExpression(
        req.token,
        req.datasetId,
        req.body
      );
      res.send(result);
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
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getIncludedConceptsCount(
        req.token,
        req.datasetId,
        req.body
      );
      res.send(result);
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
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getConceptsFromIdentifiers(
        req.token,
        req.datasetId,
        req.body
      );
      res.send(result);
    }
  );

  app.post(
    "/:sourceKey/lookup/identifiers/ancestors",
    {
      schema: {
        description:
          "Calculates the full set of ancestor and descendant concepts for a list of ancestor and descendant concepts specified. This is used by ATLAS when navigating the list of included concepts in a concept set - the full listof ancestors (as defined in the concept set) and the descendants (thoseconcepts included when resolving the concept set) are used to determine which descendant concepts share one or more ancestors.",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        body: LookupIdentifierAncestorsDto,
        response: { 200: LookupIdentifierAncestorsResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const { ancestors, descendants } = req.body;
      const results = await getAncestorsFromIdentifiers(
        req.token,
        req.datasetId,
        ancestors,
        descendants
      );
      res.send(results);
    }
  );

  app.post(
    "/:sourceKey/lookup/mapped",
    {
      schema: {
        description:
          "Get concepts mapped to the selected concept identifiers from a specific source. Find all concepts mapped to the concept identifiers provided. This end-point will check the CONCEPT, CONCEPT_RELATIONSHIP and SOURCE_TO_CONCEPT_MAP tables.",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        body: z.array(z.number()),
        response: { 200: ConceptListResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getMappedConcepts(
        req.token,
        req.datasetId,
        req.body
      );
      res.send(result);
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
        body: z.array(z.coerce.number()),
        response: { 200: ConceptRecommendedListResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getRecommendedConceptsFromIdentifiers(
        req.token,
        req.datasetId,
        req.body
      );
      res.send(result);
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
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getDomains(req.token, req.datasetId);
      res.send(result);
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
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getVocabularies(req.token, req.datasetId);
      res.send(result);
    }
  );

  app.get(
    "/:sourceKey/concept/:id",
    {
      schema: {
        description:
          "Get a concept based on the concept identifier from the specified source",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string(), id: z.coerce.number() }),
        response: { 200: ConceptResponseDto },
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
      const result = await getConceptById(req.token, req.datasetId, id);
      res.send(result);
    }
  );

  app.get(
    "/:sourceKey/concept/:id/related",
    {
      schema: {
        description:
          "Get related concepts for the selected concept identifier from a source. Related concepts will include those concepts that have a relationshipto the selected concept identifier in the CONCEPT_RELATIONSHIP and CONCEPT_ANCESTOR tables.",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string(), id: z.coerce.number() }),
        response: { 200: ConceptRelatedResponseDto },
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
      const result = await getRelatedConceptsFromIdentifier(
        req.token,
        req.datasetId,
        id
      );

      res.send(result);
    }
  );

  app.get(
    "/:sourceKey/search",
    {
      schema: {
        description:
          "Search for a concept based on a query using the default vocabulary source. NOTE: This method uses the query as part of the URL query string",
        tags: ["vocabulary"],
        params: z.object({ sourceKey: z.string() }),
        querystring: z.object({ query: z.string() }),
        response: { 200: ConceptListResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const conceptListDto = { QUERY: req.query.query };
      const result = await searchConcept(
        req.token,
        req.datasetId,
        conceptListDto
      );

      res.send(result);
    }
  );

  app.post(
    "/:sourceKey/search",
    {
      schema: {
        description:
          "Search for a concept based on a query using the default vocabulary source.",
        tags: ["vocabulary"],
        querystring: z.object({
          page: z.coerce.number(),
          rowsPerPage: z.coerce.number(),
        }),
        params: z.object({ sourceKey: z.string() }),
        body: ConceptListDto,
        response: { 200: ConceptListResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const { page, rowsPerPage } = req.query;
      const result = await searchConcept(
        req.token,
        req.datasetId,
        req.body,
        page,
        rowsPerPage
      );

      res.send(result);
    }
  );
};
