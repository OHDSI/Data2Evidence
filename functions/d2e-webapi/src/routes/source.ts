import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  SourcesResponseDto,
  DaimonPriorityResponseDto,
} from "../dto/source.ts";

// deno-lint-ignore require-await
export const source: FastifyPluginAsyncZod = async function (app) {
  app.get(
    "/sources",
    {
      schema: {
        description:
          "Gets the list of all Sources in WebAPI database. Sources with a non-null deleted_date are not returned (ie: these are soft deleted)",
        querystring: z.object({ lang: z.string().optional() }).optional(),
        response: { 200: SourcesResponseDto },
      },
    },
    (_req, res) => {
      // TODO: Update logic if required
      const dummyresponse = [
        {
          sourceId: 4,
          sourceName: "Common Evidence Model",
          sourceDialect: "postgresql",
          sourceKey: "CEM",
          daimons: [
            {
              sourceDaimonId: 15,
              daimonType: "Vocabulary",
              tableQualifier: "unrestricted",
              priority: 0,
            },
            {
              sourceDaimonId: 11,
              daimonType: "CEM",
              tableQualifier: "synpuf5pct_results",
              priority: 0,
            },
            {
              sourceDaimonId: 19,
              daimonType: "CEMResults",
              tableQualifier: "synpuf5pct_results",
              priority: 0,
            },
          ],
        },
        {
          sourceId: 6,
          sourceName: "SYNPUF 1K",
          sourceDialect: "postgresql",
          sourceKey: "SYNPUF1K",
          daimons: [
            {
              sourceDaimonId: 16,
              daimonType: "CDM",
              tableQualifier: "synpuf1k",
              priority: 0,
            },
            {
              sourceDaimonId: 17,
              daimonType: "Vocabulary",
              tableQualifier: "unrestricted",
              priority: 0,
            },
            {
              sourceDaimonId: 18,
              daimonType: "Results",
              tableQualifier: "synpuf1k_results",
              priority: 1,
            },
            {
              sourceDaimonId: 21,
              daimonType: "Temp",
              tableQualifier: "synpuf1k_temp",
              priority: 0,
            },
          ],
        },
      ];
      res.send(dummyresponse);
    }
  );

  app.get(
    "/daimon/priority",
    {
      schema: {
        description:
          "Get the first daimon (ad associated source) that has priority. In the event of a tie, the first source searched wins.",
        querystring: z.object({ lang: z.string().optional() }).optional(),
        response: { 200: DaimonPriorityResponseDto },
      },
    },
    (_req, res) => {
      // TODO: Update logic if required
      const dummyresponse = {
        CDM: {
          sourceId: 8,
          sourceName: "Evidence network counts",
          sourceDialect: "postgresql",
          sourceKey: "OHDSIEVIDNET",
          daimons: [
            {
              sourceDaimonId: 25,
              daimonType: "CDM",
              tableQualifier: "synpuf5pct",
              priority: 10,
            },
            {
              sourceDaimonId: 26,
              daimonType: "Vocabulary",
              tableQualifier: "unrestricted_vocabs",
              priority: 10,
            },
            {
              sourceDaimonId: 27,
              daimonType: "Results",
              tableQualifier: "synpuf5pct_evinet_results",
              priority: 10,
            },
          ],
        },
        CEM: {
          sourceId: 4,
          sourceName: "Common Evidence Model",
          sourceDialect: "postgresql",
          sourceKey: "CEM",
          daimons: [
            {
              sourceDaimonId: 15,
              daimonType: "Vocabulary",
              tableQualifier: "unrestricted",
              priority: 0,
            },
            {
              sourceDaimonId: 11,
              daimonType: "CEM",
              tableQualifier: "synpuf5pct_results",
              priority: 0,
            },
            {
              sourceDaimonId: 19,
              daimonType: "CEMResults",
              tableQualifier: "synpuf5pct_results",
              priority: 0,
            },
          ],
        },
        Vocabulary: {
          sourceId: 8,
          sourceName: "Evidence network counts",
          sourceDialect: "postgresql",
          sourceKey: "OHDSIEVIDNET",
          daimons: [
            {
              sourceDaimonId: 25,
              daimonType: "CDM",
              tableQualifier: "synpuf5pct",
              priority: 10,
            },
            {
              sourceDaimonId: 26,
              daimonType: "Vocabulary",
              tableQualifier: "unrestricted_vocabs",
              priority: 10,
            },
            {
              sourceDaimonId: 27,
              daimonType: "Results",
              tableQualifier: "synpuf5pct_evinet_results",
              priority: 10,
            },
          ],
        },
        Results: {
          sourceId: 8,
          sourceName: "Evidence network counts",
          sourceDialect: "postgresql",
          sourceKey: "OHDSIEVIDNET",
          daimons: [
            {
              sourceDaimonId: 25,
              daimonType: "CDM",
              tableQualifier: "synpuf5pct",
              priority: 10,
            },
            {
              sourceDaimonId: 26,
              daimonType: "Vocabulary",
              tableQualifier: "unrestricted_vocabs",
              priority: 10,
            },
            {
              sourceDaimonId: 27,
              daimonType: "Results",
              tableQualifier: "synpuf5pct_evinet_results",
              priority: 10,
            },
          ],
        },
        Temp: {
          sourceId: 5,
          sourceName: "SYNPUF 5%",
          sourceDialect: "postgresql",
          sourceKey: "SYNPUF5PCT",
          daimons: [
            {
              sourceDaimonId: 12,
              daimonType: "CDM",
              tableQualifier: "synpuf5pct",
              priority: 0,
            },
            {
              sourceDaimonId: 13,
              daimonType: "Vocabulary",
              tableQualifier: "unrestricted",
              priority: 0,
            },
            {
              sourceDaimonId: 14,
              daimonType: "Results",
              tableQualifier: "synpuf5pct_results",
              priority: 1,
            },
            {
              sourceDaimonId: 20,
              daimonType: "Temp",
              tableQualifier: "synpuf5pct_temp",
              priority: 0,
            },
          ],
        },
        CEMResults: {
          sourceId: 4,
          sourceName: "Common Evidence Model",
          sourceDialect: "postgresql",
          sourceKey: "CEM",
          daimons: [
            {
              sourceDaimonId: 15,
              daimonType: "Vocabulary",
              tableQualifier: "unrestricted",
              priority: 0,
            },
            {
              sourceDaimonId: 11,
              daimonType: "CEM",
              tableQualifier: "synpuf5pct_results",
              priority: 0,
            },
            {
              sourceDaimonId: 19,
              daimonType: "CEMResults",
              tableQualifier: "synpuf5pct_results",
              priority: 0,
            },
          ],
        },
      };
      res.send(dummyresponse);
    }
  );
};
