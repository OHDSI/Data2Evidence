import { z } from "zod";

const filtersSchema = z
  .object({
    conceptClassId: z.array(z.string()).default([]),
    domainId: z.array(z.string()).default([]),
    standardConcept: z.array(z.string()).default([]),
    vocabularyId: z.array(z.string()).default([]),
    validity: z.array(z.enum(["Valid", "Invalid"])).default([]),
  })
  .default({
    conceptClassId: [],
    domainId: [],
    standardConcept: [],
    vocabularyId: [],
    validity: [],
  });

export const getConceptsQuery = z.object({
  offset: z
    .string()
    .refine((val) => !isNaN(parseInt(val)))
    .transform(Number),
  count: z
    .string()
    .refine((val) => !isNaN(parseInt(val)))
    .transform(Number),
  datasetId: z.string().uuid(),
  code: z.string(),
  filter: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return filtersSchema.parse({});
      try {
        const parsed = JSON.parse(value);
        return filtersSchema.parse(parsed);
      } catch {
        return filtersSchema.parse({});
      }
    }),
});
export const getConcepts = z.object({
  query: getConceptsQuery,
});

export const getConceptsCountQuery = z.object({
  datasetId: z.string().uuid(),
  code: z.string(),
  filter: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return filtersSchema.parse({});
      try {
        const parsed = JSON.parse(value);
        return filtersSchema.parse(parsed);
      } catch {
        return filtersSchema.parse({});
      }
    }),
});
export const getConceptsCount = z.object({
  query: getConceptsCountQuery,
});

export const getConceptFilterOptionsQuery = z.object({
  datasetId: z.string().uuid(),
  searchText: z.string(),
  filter: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return filtersSchema.parse({});
      try {
        const parsed = JSON.parse(value);
        return filtersSchema.parse(parsed);
      } catch {
        return filtersSchema.parse({});
      }
    }),
});
export const getConceptFilterOptions = z.object({
  query: getConceptFilterOptionsQuery,
});

export const getTerminologyDetailsWithRelationshipsQuery = z.object({
  datasetId: z.string().uuid(),
  conceptId: z.string().transform(Number),
});
export const getTerminologyDetailsWithRelationships = z.object({
  query: getTerminologyDetailsWithRelationshipsQuery,
});

export const searchConceptByNameBody = z.object({
  datasetId: z.string().uuid(),
  conceptName: z.string(),
});
export const searchConceptByName = z.object({
  body: searchConceptByNameBody,
});

export const searchConceptByIdBody = z.object({
  datasetId: z.string().uuid(),
  conceptId: z.number(),
});
export const searchConceptById = z.object({
  body: searchConceptByIdBody,
});

export const searchConceptByCodeBody = z.object({
  datasetId: z.string().uuid(),
  conceptCode: z.string(),
});
export const searchConceptByCode = z.object({
  body: searchConceptByCodeBody,
});

export const getRecommendedConceptsBody = z.object({
  datasetId: z.string().uuid(),
  conceptIds: z.array(z.number()),
});
export const getRecommendedConcepts = z.object({
  body: getRecommendedConceptsBody,
});

export const getConceptHierarchyQuery = z.object({
  datasetId: z.string().uuid(),
  conceptId: z
    .string()
    .refine((val) => !isNaN(Number(val)), { message: "Must be a valid number" })
    .transform(Number),
  depth: z
    .string()
    .refine((val) => !isNaN(Number(val)), { message: "Must be a valid number" })
    .transform(Number)
    .pipe(z.number().min(1).max(10)),
});
export const getConceptHierarchy = z.object({
  query: getConceptHierarchyQuery,
});

export const getStandardConceptsBody = z.object({
  datasetId: z.string().uuid(),
  data: z.array(
    z.object({
      index: z.number(),
      searchText: z.string(),
      domainId: z.string().optional(),
    })
  ),
});
export const getStandardConcepts = z.object({
  body: getStandardConceptsBody,
});
