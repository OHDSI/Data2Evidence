import { z } from 'zod'

export const AtlasCohortDefinitionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdDate: z.number().nullable(),
  modifiedBy: z.string().nullable(),
  modifiedDate: z.number().nullable(),
  hasWriteAccess: z.boolean(),
  hasReadAccess: z.boolean(),
  tags: z.array(z.string()),
  cohortDefinitionId: z.number().optional(),
})

export const BookmarkSchema = z.object({
  bmkId: z.string(),
  bookmarkname: z.string(),
  bookmark: z.string(),
  viewname: z.string().nullable(),
  modified: z.string(),
  version: z.number().nullable(),
  user_id: z.string(),
  shared: z.boolean(),
  cohortDefinitionId: z.number().optional(),
  paConfigId: z.string().optional(),
})

export const MaterializedCohortSchema = z.object({
  id: z.number(),
  patientCount: z.number(),
  cohortDefinitionName: z.string(),
  createdOn: z.string(),
  description: z.string(),
})

