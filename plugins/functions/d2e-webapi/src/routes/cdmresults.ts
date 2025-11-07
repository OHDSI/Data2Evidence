import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CdmresultsConceptRecordCountDto,
  CdmresultsConceptRecordCountResponseDto,
} from "../dto/cdmresults.ts";
import { getConceptRecordCount } from "../services/cdmresults.service.ts";

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
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getConceptRecordCount(
        req.token,
        req.datasetId,
        req.body
      );
      res.send(result);
    }
  );
};
