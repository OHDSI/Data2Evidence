import { z } from "zod";

export const ALLOWED_SORT_COLUMNS = [
  "concept_id",
  "concept_name",
  "vocabulary_id",
  "concept_code",
  "concept_class_id",
  "domain_id",
  "standard_concept",
  "score",
] as const;

export type AllowedSortColumn = (typeof ALLOWED_SORT_COLUMNS)[number];

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
    .transform(Number)
    .refine((val) => val > 0, { message: "count must be a positive integer" }),
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
  sortBy: z.enum(ALLOWED_SORT_COLUMNS).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
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

export const getConceptIdsQuery = z.object({
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
export const getConceptIds = z.object({
  query: getConceptIdsQuery,
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

export const checkConceptCoverageBody = z.object({
  datasetId: z.string().uuid(),
  conceptIds: z.array(z.number()),
});
export const checkConceptCoverage = z.object({
  body: checkConceptCoverageBody,
});
