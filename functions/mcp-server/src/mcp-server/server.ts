import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchCohortData } from "../utils/utils";

export const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
});

// Register Get Cohorts ID Name List Tool
server.registerTool(
  "get_cohorts_id_name_list",
  {
    title: "Get Cohorts ID Name List",
    description:
      "Get all the cohort names and ids from OHDSI Phenotype Library",
    inputSchema: {
      cohort_info: z
        .string()
        .describe("The cohort description extracted from user query"),
    },
    outputSchema: {
      cohorts: z.array(
        z.object({
          cohortId: z.string(),
          cohortName: z.string(),
          cohortNameFormatted: z.string(),
          cohortNameLong: z.string(),
          logicDescription: z.string(),
        })
      ),
    },
  },
  async ({ cohort_info }) => {
    const cohortData = await fetchCohortData();

    return {
      content: [
        {
          type: "text",
          text: `Here is the list of cohort names and ids definition with description of '${cohort_info}' found from the Phenotype Library: ${JSON.stringify(
            cohortData
          )}`,
        },
      ],
      structuredContent: {
        cohorts: cohortData,
      },
    };
  }
);

// Register Prompt for getting Cohort Info
server.registerPrompt(
  "prompt_for_get_cohort_id",
  {
    title: "Prompt after getting cohort info from User Query",
    description:
      "This prompt should be used to understand the user's initial query.",
    argsSchema: {
      cohort_info: z.string(),
      cohort_name_id_list: z.string(),
    },
  },
  ({ cohort_info, cohort_name_id_list }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `match ${cohort_info} with ${cohort_name_id_list} to list all the relevant cohort ids and names (as much as possible), and finally rank the result with confidence score. Answer in the format of 'cohort id: <cohort id>, cohort name: <cohort name>, confidence score: <score>'.`,
        },
      },
    ],
  })
);
