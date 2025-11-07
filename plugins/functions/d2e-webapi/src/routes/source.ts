import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import {
  SourcesResponseDto,
  DaimonPriorityResponseDto,
} from "../dto/source.ts";

import { getSources, getDaimonPriority } from "../services/source.service.ts";

// deno-lint-ignore require-await
export const source: FastifyPluginAsyncZod = async function (app) {
  app.get(
    "/sources",
    {
      schema: {
        description:
          "Gets the list of all Sources in WebAPI database. Sources with a non-null deleted_date are not returned (ie: these are soft deleted)",
        response: { 200: SourcesResponseDto },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getSources(req.token);
      res.send(result);
    }
  );

  app.get(
    "/daimon/priority",
    {
      schema: {
        description:
          "Get the first daimon (ad associated source) that has priority. In the event of a tie, the first source searched wins.",
        response: { 200: DaimonPriorityResponseDto },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getDaimonPriority(req.token);
      res.send(result);
    }
  );
};
