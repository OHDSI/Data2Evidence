import z from "zod";
import { IDuckdbFacetSchema } from "../types.ts";

export const getConceptFilterOptionsSchema = z.object({
  filterOptions: IDuckdbFacetSchema,
});

export type GetConceptFilterOptions = z.infer<
  typeof getConceptFilterOptionsSchema
>;
