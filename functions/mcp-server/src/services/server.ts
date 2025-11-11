import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fetchCohortData,
  fetchCohortDefinitionTemplate,
  fetchPhenotypeData,
} from "../utils/utils";

export const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
});

// Tool Get Cohorts ID Name List Tool from Phenotype Library
server.registerTool(
  "get_cohort_id_name_list",
  {
    title: "Get Cohort ID and Name List",
    description:
      "Rank the cohort ids and names for the relevant cohort description extracted from the user query. Return the list of cohort ids and names in structured content. Automatically invoked when user query is related to cohort id information.",
    inputSchema: {
      cohortInfo: z
        .string()
        .describe("The cohort description extracted from user query"),
    },
    outputSchema: {
      cohortsId: z.array(
        z.object({
          cohortId: z.string(),
          cohortName: z.string(),
          cohortDescription: z.string(),
        })
      ),
    },
  },
  async ({}) => {
    // Fetch d2e cohort list
    const cohortData = await fetchCohortData();
    return {
      content: [
        {
          type: "text",
          text: `Here is the list of cohort ids and names for all cohort description.`,
        },
      ],
      structuredContent: {
        cohortsId: cohortData,
      },
    };
  }
);

server.registerTool(
  "search_phenotype_library",
  {
    title: "Search OHDSI Phenotype Library",
    description:
      "Returns phenotypes from OHDSI Phenotype Library with IDs, names, and logic descriptions. Use this to find phenotype IDs that are relevant to the user's cohort requirements.",
    inputSchema: {}, // No input - returns everything for LLM to analyze
  },
  async () => {
    const phenotypeData = await fetchPhenotypeData();
    return {
      content: [
        {
          type: "text",
          text: `Retrieved phenotypes. Analyze this list to identify relevant phenotype IDs for the cohort definition.`,
        },
      ],
      structuredContent: {
        phenotypes: phenotypeData,
      },
    };
  }
);

server.registerTool(
  "fetch_templates_for_cohort_generation",
  {
    title: "Fetch Cohort Templates for Generation",
    description:
      "Fetches ATLAS cohort definition templates from OHDSI Phenotype Library for specified phenotype ID. The template serve as example to create a new cohort definition.",
    inputSchema: {
      phenotypeId: z
        .number()
        .describe("Most relevant phenotype ID to use as template examples"),
      userCohortDescription: z
        .string()
        .describe("The user's description of the cohort they want to create"),
    },
  },
  async ({ phenotypeId, userCohortDescription }) => {
    // Fetch templates for the selected phenotype ID
    const template = await fetchCohortDefinitionTemplate(phenotypeId);
    return {
      content: [
        {
          type: "text",
          text: `Fetched cohort definition template. User Requirements: ${userCohortDescription} Example Templates Retrieved: - Phenotype ID ${phenotypeId}. Continue to generate a complete ATLAS cohort definition JSON using these templates as structural examples.`,
        },
      ],
      structuredContent: {
        userRequirements: userCohortDescription,
        exampleTemplates: template,
      },
    };
  }
);

server.registerTool(
  "generate_cohort_definition_instruction",
  {
    title: "Instruction to Generate Cohort Definition",
    description:
      "Instruction must follow when generate cohort definition for user description.",
    inputSchema: {
      cohortDescription: z
        .string()
        .describe("User's description of the desired cohort"),
    },
  },
  async ({ cohortDescription }) => {
    return {
      content: [
        {
          type: "text",
          text: `Create a standardized OHDSI ATLAS cohort definition for: "${cohortDescription}"
          Workflow:
            1. First, call search_phenotype_library to get the available phenotypes
            2. Identify a most relevant phenotype ID based on names and logic descriptions
            3. Call fetch_templates_for_cohort_generation with phenotype ID
            4. Generate the final cohort definition JSON, adapting the templates to match cohort description.
            Output: Complete, valid ATLAS cohort definition in JSON format. The final reply of cohort definition must without any additional explanation, and without generating new file.`,
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
      "Rank and order the cohort_ids and names based on relevance of cohortInfo and clinical practices.",
    argsSchema: { cohortInfo: z.string() },
  },
  ({ cohortInfo }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please rank and organize the output after getting cohort id and names based on relevance of ${cohortInfo} with clinical practices. Output in format of cohortId: cohortName.`,
        },
      },
    ],
  })
);
