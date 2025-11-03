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

// Tool for ATLAS Cohort Definition: Step 1 - Get Ranked Cohort IDs and Names
server.registerTool(
  "create_cohort_definition_step1",
  {
    title: "Create Cohort Definition: Get Ranked Cohort IDs and Names",
    description:
      "Get relevant cohort id and names for user provided cohort info",
    inputSchema: {
      cohort_details: z
        .string()
        .describe("The cohort description extracted from user query"),
    },
  },
  async ({ cohort_details }) => {
    `Calling the tool <get_cohort_id_name_list> to get cohorts_id_name, then pass ranked_cohort_id that are relavant to cohort_details to this tool`;
    return {
      content: [
        {
          type: "text",
          text: `Get the ranked cohort ids and names list relevant to user provided cohort details: ${cohort_details}`,
        },
      ],
    };
  }
);

// Tool for ATLAS Cohort Definition: Step 2 - Create Standardized OHDSI ATLAS Cohort Definition JSON
server.registerTool(
  "Create_cohort_definition_step2",
  {
    title:
      "Create Cohort Definition: Create Standardized ATLAS Cohort Definition",
    description:
      "Get relevant cohort id and names for user provided cohort info",
    inputSchema: {
      cohort_details: z
        .string()
        .describe("The cohort description extracted from user query"),
    },
  },
  async ({ cohort_details }) => {
    `got the cohort ids and names from tool <create_cohort_definition_step1>, and now create the standardized OHDSI ATLAS cohort definition in json format based on user provided ${cohort_details} and ranked cohort id and names from previous tool.`;
    return {
      content: [
        {
          type: "text",
          text: `The standardized OHDSI ATLAS cohort definition in json format is`,
        },
      ],
    };
  }
);

// Prompt to format and organize cohort ids and names list
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
        role: "system",
        content: {
          type: "text",
          text: `Please rank and organize the output after getting cohort id and names based on relevance of ${cohort_info} with clinical practices. Output in format of cohortId: cohortName.`,
        },
      },
    ],
  })
);
