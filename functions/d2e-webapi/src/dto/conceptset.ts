import { z } from "zod";
import { ConceptSetExpression } from "../types.ts";

export const ConceptSetDto = z.object({
  id: z.number(),
  name: z.string(),
});

export const ConceptSetItemsResponseDto = z.object({
  items: z.array(ConceptSetExpression),
});

export const ConceptSetCheckDto = ConceptSetDto.extend({
  description: z.string().nullable(),
  expression: ConceptSetItemsResponseDto,
});

// TODO: ADD TYPES
export const ConceptSetCheckResponseDto = z.object({
  warnings: z.array(z.unknown()),
});

export const ConceptSetItemDto = z.object({
  conceptId: z.number(),
  isExcluded: z.boolean(),
  includeDescendants: z.boolean(),
  includeMapped: z.boolean(),
});

export const ConceptSetItemListDto = z.array(ConceptSetItemDto);

export const ConceptSetTagGroup = z.object({
  createdDate: z.number(),
  modifiedDate: z.number(),
  hasWriteAccess: z.boolean(),
  hasReadAccess: z.boolean(),
  id: z.number(),
  // TODO add types for groups
  groups: z.array(z.unknown()),
  name: z.string(),
  type: z.string(),
  count: z.number(),
  showGroup: z.boolean(),
  multiSelection: z.boolean(),
  permissionProtected: z.boolean(),
  icon: z.string(),
  color: z.string(),
  mandatory: z.boolean(),
  allowCustom: z.boolean(),
  description: z.string(),
});

export const ConceptSetTag = z.object({
  createdDate: z.number(),
  hasWriteAccess: z.boolean(),
  hasReadAccess: z.boolean(),
  id: z.number(),
  groups: z.array(ConceptSetTagGroup),
  name: z.string(),
  type: z.string(),
  count: z.number(),
  showGroup: z.boolean(),
  multiSelection: z.boolean(),
  permissionProtected: z.boolean(),
  mandatory: z.boolean(),
  allowCustom: z.boolean(),
});

export const ConceptSetResponseDto = z.object({
  createdDate: z.number(),
  modifiedDate: z.number(),
  hasWriteAccess: z.boolean(),
  hasReadAccess: z.boolean(),
  tags: z.array(ConceptSetTag).optional(),
  description: z.string().optional(),
  id: z.number(),
  name: z.string(),
});

export const ConceptSetListResponseDto = z.array(ConceptSetResponseDto);
export type IConceptSetListResponseDto = z.infer<
  typeof ConceptSetListResponseDto
>;
