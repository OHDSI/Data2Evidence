import { z } from 'zod'

export const criteriaSchema = z.object({
  ConceptSets: z.array(z.any()),
  PrimaryCriteria: z.object({
    CriteriaList: z.array(z.any()),
    ObservationWindow: z.object({
      PriorDays: z.number(),
      PostDays: z.number(),
    }),
    PrimaryCriteriaLimit: z.object({
      Type: z.string(),
    }),
  }),
  QualifiedLimit: z.object({
    Type: z.string(),
  }),
  ExpressionLimit: z.object({
    Type: z.string(),
  }),
  InclusionRules: z.array(z.any()),
  CensoringCriteria: z.array(z.any()),
  CollapseSettings: z.object({
    CollapseType: z.string(),
    EraPad: z.number(),
  }),
  CensorWindow: z.object({}).optional(),
})

