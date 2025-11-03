import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchCohortData } from "../utils/utils";

export const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
});

// Register Get Cohorts ID Name List Tool
server.registerTool(
  "get_cohort_id_name_list",
  {
    title: "Get Cohort ID and Name List",
    description:
      "Rank the cohort ids and names for the relevant cohort description extracted from the user query. Return the list of cohort ids and names in structured content. Automatically invoked when user query is related to cohort id information.",
    inputSchema: {
      cohort_info: z
        .string()
        .describe("The cohort description extracted from user query"),
    },
    outputSchema: {
      cohorts_id_name: z.array(
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
  async () => {
    const cohortData = await fetchCohortData();
    return {
      content: [
        {
          type: "text",
          text: `Here is the list of cohort ids and names for all cohort description.`,
        },
      ],
      structuredContent: {
        cohorts_id_name: cohortData,
      },
    };
  }
);

server.registerPrompt(
  "organize_cohort_ids_names_list",
  {
    title: "Organize Cohort IDs and Names List",
    description:
      "Rank and order the cohort_ids and names based on relevance of cohort_info and clinical practices.",
    argsSchema: { cohort_info: z.string() },
  },
  ({ cohort_info }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please rank and organize the output after getting cohort id and names based on relevance of ${cohort_info} with clinical practices. Output in format of cohortId: cohortName.`,
        },
      },
    ],
  })
);
