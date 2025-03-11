import { z } from "zod";

export const createConceptSetBody = z.object({
  concepts: z.array(
    z.object({
      id: z.number(),
      useDescendants: z.boolean(),
      useMapped: z.boolean(),
    })
  ),
  name: z.string(),
  shared: z.boolean(),
  userName: z.string(),
});

export const getConceptSetQuery = z.object({ datasetId: z.string() });
export const getConceptSetParams = z.object({
  conceptSetId: z.coerce.number(),
});
export const getConceptSet = z.object({
  query: getConceptSetQuery,
  params: getConceptSetParams,
});
export const getConceptSets = z.object({
  query: getConceptSetQuery,
});

export const createConceptSetQuery = z.object({ datasetId: z.string() });

export const createConceptSet = z.object({
  body: createConceptSetBody,
  query: createConceptSetQuery,
});

export const updateConceptSetBody = z
  .object({
    concepts: z.array(
      z.object({
        id: z.number(),
        useDescendants: z.boolean(),
        useMapped: z.boolean(),
      })
    ),
    name: z.string(),
    shared: z.boolean(),
    userName: z.string(),
  })
  .partial();
export const updateConceptSetParams = z.object({
  conceptSetId: z.coerce.number(),
});
export const updateConceptSetQuery = z.object({ datasetId: z.string() });
export const updateConceptSet = z.object({
  body: updateConceptSetBody,
  params: updateConceptSetParams,
  query: updateConceptSetQuery,
});
export const removeConceptSetParams = z.object({
  conceptSetId: z.coerce.number(),
});
export const removeConceptSetQuery = z.object({ datasetId: z.string() });
export const removeConceptSet = z.object({
  params: removeConceptSetParams,
  query: removeConceptSetQuery,
});

export const getIncludedConceptsBody = z.object({
  datasetId: z.string(),
  conceptSetIds: z.array(z.coerce.number()),
});
export const getIncludedConcepts = z.object({
  body: getIncludedConceptsBody,
});

export const resolveConceptSetExpressionBody = z.object({
  datasetId: z.string(),
  concepts: z.array(
    z.object({
      id: z.number(),
      useMapped: z.boolean(),
      useDescendants: z.boolean(),
    })
  ),
});
export const resolveConceptSetExpression = z.object({
  body: resolveConceptSetExpressionBody,
});
