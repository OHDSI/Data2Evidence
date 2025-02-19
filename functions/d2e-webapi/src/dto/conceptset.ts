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
  warnings: z.array(z.object({})),
});

export const ConceptSetResponseDto = z.object({
  createdDate: z.number(),
  modifiedDate: z.number(),
  hasWriteAccess: z.boolean(),
  hasReadAccess: z.boolean(),
  tags: z.array(z.string()).optional(),
  id: z.number(),
  name: z.string(),
});

export const ConceptSetListResponseDto = z.array(ConceptSetResponseDto);

export const ConceptSetItemDto = z.object({
  conceptId: z.number(),
  isExcluded: z.boolean(),
  includeDescendants: z.boolean(),
  includeMapped: z.boolean(),
});

export const ConceptSetItemListDto = z.array(ConceptSetItemDto);
