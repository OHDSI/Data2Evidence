import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import * as conceptSchemas from "../controllers/validators/conceptSchemas.ts";
import * as resTypes from "../controllers/responseTypes.ts";
import z from "zod";

export const registerApi = (registry: OpenAPIRegistry) => {
  registry.registerPath({
    method: "get",
    path: "/terminology/fhir/4_0_0/valueset/$expand",
    description: "List of concepts",
    summary: "List of concepts",
    request: { query: conceptSchemas.getConceptsQuery },
    responses: {
      200: {
        description: "Object with concept set data.",
        content: {
          "application/json": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["Concept", "FHIR"],
  });

  registry.registerPath({
    method: "get",
    path: "/terminology/concept/count",
    description: "Get concepts count for current search and filter",
    summary: "Get concepts count for current search and filter",
    request: {
      query: conceptSchemas.getConceptsCountQuery,
    },
    responses: {
      200: {
        description: "Concepts count for current search and filter.",
        content: {
          "application/json": {
            schema: z.number(),
          },
        },
      },
    },
    tags: ["Concept"],
  });

  registry.registerPath({
    method: "get",
    path: "/terminology/concept/filter-options",
    description: "Get filter options for current search",
    summary: "Get filter options for current search",
    request: {
      query: conceptSchemas.getConceptFilterOptionsQuery,
    },
    responses: {
      200: {
        description: "Object with concept set data.",
        content: {
          "application/json": {
            schema: resTypes.getConceptFilterOptionsSchema,
          },
        },
      },
    },
    tags: ["Concept"],
  });

  registry.registerPath({
    method: "get",
    path: "/terminology/fhir/4_0_0/conceptmap/$translate",
    description: "List concept details and connections",
    summary: "List concept details and connections",
    request: {
      query: conceptSchemas.getTerminologyDetailsWithRelationshipsQuery,
    },
    responses: {
      200: {
        description: "Object with concept set data.",
        content: {
          "application/json": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["Concept", "FHIR"],
  });

  registry.registerPath({
    method: "post",
    path: "/terminology/concept/searchById",
    description: "Get concept by Id",
    summary: "Get concept by Id",
    request: {
      body: {
        content: {
          "application/json": { schema: conceptSchemas.searchConceptByIdBody },
        },
      },
    },
    responses: {
      200: {
        description: "Object with concept set data.",
        content: {
          "application/json": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["Concept"],
  });

  registry.registerPath({
    method: "post",
    path: "/terminology/concept/searchByName",
    description: "Get concept by name",
    summary: "Get concept by name",
    request: {
      body: {
        content: {
          "application/json": {
            schema: conceptSchemas.searchConceptByNameBody,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Object with concept set data.",
        content: {
          "application/json": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["Concept"],
  });

  registry.registerPath({
    method: "post",
    path: "/terminology/concept/searchByCode",
    description: "Get concept by code",
    summary: "Get concept by code",
    request: {
      body: {
        content: {
          "application/json": {
            schema: conceptSchemas.searchConceptByCodeBody,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Object with concept set data.",
        content: {
          "application/json": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["Concept"],
  });

  registry.registerPath({
    method: "post",
    path: "/terminology/concept/recommended/list",
    description: "List recommended concepts",
    summary: "List recommended concepts",
    request: {
      body: {
        content: {
          "application/json": {
            schema: conceptSchemas.getRecommendedConceptsBody,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Object with concept set data.",
        content: {
          "application/json": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["Concept"],
  });

  registry.registerPath({
    method: "get",
    path: "/terminology/concept/hierarchy",
    description: "List hierarchical items of a concept",
    summary: "List hierarchical items of a concept",
    request: {
      query: conceptSchemas.getConceptHierarchy,
    },
    responses: {
      200: {
        description: "Object with concept set data.",
        content: {
          "application/json": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["Concept"],
  });

  registry.registerPath({
    method: "post",
    path: "/terminology/concept/getStandardConcepts",
    description: "List all standard concepts",
    summary: "List all standard concepts",
    request: {
      body: {
        content: {
          "application/json": {
            schema: conceptSchemas.getStandardConcepts,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Object with concept set data.",
        content: {
          "application/json": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["Concept"],
  });
};
