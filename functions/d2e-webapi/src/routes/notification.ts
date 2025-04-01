import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { NotificationResponseDto } from "../dto/notification.ts";

// deno-lint-ignore require-await
export const notification: FastifyPluginAsyncZod = async function (app) {
  app.get(
    "/",
    {
      schema: {
        description: "Get the list of notifications",
        querystring: z.object({
          hideStatuses: z
            .string()
            .optional()
            .describe(
              "Used to filter statuses - passes as a comma-delimited list"
            ),
          refreshJobs: z.coerce
            .boolean()
            .describe("when true, it will refresh the cache of notifications")
            .default(false),
        }),
        response: { 200: NotificationResponseDto },
      },
    },
    (_req, res) => {
      // TODO: Update logic if required
      const dummyresponse = [
        // {
        //   status: "COMPLETED",
        //   startDate: 1739277095377,
        //   endDate: 1739277133405,
        //   exitStatus: "COMPLETED",
        //   executionId: 75423,
        //   jobInstance: {
        //     instanceId: 75427,
        //     name: "irAnalysis",
        //   },
        //   jobParameters: {
        //     jobName:
        //       "IR Analysis: 1747610: Evidence network counts (OHDSIEVIDNET)",
        //     jobAuthor: "anonymous",
        //     source_id: "8",
        //     analysis_id: "1747610",
        //   },
        //   ownerType: "ALL_JOB",
        // },
        // {
        //   status: "COMPLETED",
        //   startDate: 1739319605768,
        //   endDate: 1739319612722,
        //   exitStatus: "COMPLETED",
        //   executionId: 75426,
        //   jobInstance: {
        //     instanceId: 75430,
        //     name: "generateCohort",
        //   },
        //   jobParameters: {
        //     jobName: "Generating cohort 1792002 : SYNPUF 5% (SYNPUF5PCT)",
        //     jobAuthor: "anonymous",
        //     source_id: "5",
        //     cohort_definition_id: "1792002",
        //   },
        //   ownerType: "ALL_JOB",
        // },
        // {
        //   status: "COMPLETED",
        //   startDate: 1739295027899,
        //   endDate: 1739295055962,
        //   exitStatus: "COMPLETED",
        //   executionId: 75424,
        //   jobInstance: {
        //     instanceId: 75428,
        //     name: "generateCohort",
        //   },
        //   jobParameters: {
        //     jobName: "Generating cohort 1788821 : SYNPUF 5% (SYNPUF5PCT)",
        //     jobAuthor: "anonymous",
        //     source_id: "5",
        //     cohort_definition_id: "1788821",
        //   },
        //   ownerType: "ALL_JOB",
        // },
        // {
        //   status: "COMPLETED",
        //   startDate: 1739320203231,
        //   endDate: 1739320212782,
        //   exitStatus: "COMPLETED",
        //   executionId: 75430,
        //   jobInstance: {
        //     instanceId: 75434,
        //     name: "cohortAnalysisJob",
        //   },
        //   jobParameters: {
        //     jobName: "HERACLES_COHORT_1792003_SYNPUF1K",
        //     jobAuthor: "anonymous",
        //     cohortDefinitionIds: "1792003",
        //   },
        //   ownerType: "ALL_JOB",
        // },
      ];
      res.send(dummyresponse);
    }
  );
};
