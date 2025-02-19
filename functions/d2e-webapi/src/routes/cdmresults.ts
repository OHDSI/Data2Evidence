import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CdmresultsConceptRecordCountDto,
  CdmresultsConceptRecordCountResponseDto,
} from "../dto/cdmresults.ts";

// deno-lint-ignore require-await
export const cdmresults: FastifyPluginAsyncZod = async function (app) {
  app.post(
    "/:sourceKey/conceptRecordCount",
    {
      schema: {
        description:
          "Get the record count and descendant record count for one or more concepts in a single CDM database",
        tags: ["cdmresults"],
        params: z.object({ sourceKey: z.string() }),
        body: CdmresultsConceptRecordCountDto,
        response: { 200: CdmresultsConceptRecordCountResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse: z.infer<
        typeof CdmresultsConceptRecordCountResponseDto
      > = [
        {
          "2106236": [10579512, 10579512, 0, 0],
        },
        {
          "2106238": [5756362, 5756362, 0, 0],
        },
        {
          "2106252": [3356284, 3356284, 0, 0],
        },
      ];
      res.send(dummyresponse);
    }
  );
};
