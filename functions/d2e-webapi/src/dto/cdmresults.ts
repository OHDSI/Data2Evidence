import { z } from "zod";

export const CdmresultsConceptRecordCountDto = z.array(z.number());
export const CdmresultsConceptRecordCountResponseDto = z.array(
  z.record(z.string(), z.array(z.number()))
);
