import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fetchCohortData,
  fetchCohortDefinitionTemplate,
  fetchPhenotypeData,
  getCohortDefinition,
  createCohortDefinition,
  updateCohortDefinition,
  deleteCohortDefinition,
} from "../utils/utils";

export const server = new McpServer({
  name: "d2e-mcp-server",
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

// Tool to instruct ATLAS cohort definition creation in D2E
server.registerTool(
  "before_cohort_definition_generation",
  {
    title: "Instruction to Generate Cohort Definition",
    description:
      "Must follow this instruction before generate/create cohort definition.",
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
          text: `
          cohort description: ${cohortDescription}

          Strictly follow to-do list below for creation of ATLAS cohort definition:
            1. Get available phenotypes by caling **search_phenotype_library**
            2. Identify a most relevant phenotype ID from 1 that closely matches the cohort description.
            3. Fetch cohort definition template with phenotype ID from 2 using tool **fetch_templates_for_cohort_generation**
            4. Looking at the template from 3 carefully, only use valid syntax (those exist in template), understand the cohort description, based on template and cohort information, draft and output a complete and valid ATLAS cohort definition in JSON format, without any additional explanation and without generating new file. Double check to make sure the syntax is valid ATLAS JSON format. 
            5. Wait for user's confirmation for next action, your question of "create in D2E" with "y" or "yes", you can call tool **manage_atlas_cohort_definition** with generated ATLAS cohort definition JSON from 4`,
        },
      ],
    };
  }
);

// Tool to search phenotype library and return relevant phenotype IDs
server.registerTool(
  "search_phenotype_library",
  {
    title: "Search OHDSI Phenotype Library",
    description:
      "Return phenotypes from OHDSI Phenotype Library with IDs, names, and logic descriptions. Use this to find phenotype IDs that are relevant to the user's cohort requirements.",
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

// Tool to fetch cohort definition template by phenotype ID
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

// Tool to create ATLAS cohort definition in D2E
server.registerTool(
  "create_atlas_cohort_definition",
  {
    title: "Create Atlas Cohort Definition in D2E",
    description:
      "Create the ATLAS cohort definition in D2E using generated json result from conversation.",
    inputSchema: {
      atlastCohortDefinition: z
        .any()
        .describe("Atlas cohort definition in json to be populated in D2E"),
      userName: z.string().describe("User name creating the cohort"),
      cohortInfo: z.string().describe("The cohort description"),
    },
  },
  async ({ atlastCohortDefinition, userName, cohortInfo }, { requestInfo }) => {
    const cohortDefinition = {
      expression: atlastCohortDefinition,
      cohortInfo: cohortInfo,
      userName: userName,
    };
    const authorization = requestInfo?.headers?.authorization;
    if (!authorization) {
      throw new Error("Authorization header is missing");
    }
    const res = await createCohortDefinition(cohortDefinition, authorization);
    if (!res) {
      throw new Error("Failed to create cohort definition in D2E");
    }

    return {
      content: [
        {
          type: "text",
          text: `The cohort definition has been created successfully with ID: ${res.id} and Name: ${res.name}`,
        },
      ],
    };
  }
);

// Tool to manage ATLAS cohort definition in D2E
server.registerTool(
  "manage_atlas_cohort_definition",
  {
    title: "Manage Atlas Cohorts in D2E",
    description:
      "Get, Create, Update or Delete the Atlas Cohort Definition in D2E.",
    inputSchema: {
      action: z.enum(["get", "create", "update", "delete"])
        .describe(`Action to perform on the cohort definition.
          - "get": Retrieve an existing cohort from d2e with user provided cohortId.
          - "create": Create a new cohort definition in d2e using atlastCohortDefinition.
          - "update": Update an existing cohort definition identified in d2e by cohortId with atlastCohortDefinition.
          - "delete": Delete an existing cohort definition identified in d2e by cohortId
          .`),
      atlastCohortDefinition: z
        .any()
        .describe(
          "Atlas cohort definition in json, include concept sets and expression"
        )
        .optional(),
      userName: z.string().describe("User name creating the cohort").optional(),
      cohortInfo: z.string().describe("The cohort description").optional(),
      cohortId: z
        .number()
        .describe("The cohort ID to update or delete")
        .optional(),
      cohort: z
        .any()
        .describe("The complete cohort definition object")
        .optional(),
    },
  },
  async (
    { action, atlastCohortDefinition, userName, cohortInfo, cohortId, cohort },
    { requestInfo }
  ) => {
    let authorization = requestInfo?.headers?.authorization;
    let datasetId = requestInfo?.headers?.datasetid;
    if (!authorization) {
      throw new Error("Cannot create cohort in D2E, authorization is missing");
    } else {
      authorization = String(authorization);
    }

    const logMessage = `The cohort definition has been ${action} with ID: `;
    let content: any[] = [];
    let structuredContent: any = {};
    switch (action) {
      case "create": {
        const cohortDefinition = {
          expression: atlastCohortDefinition,
          cohortInfo: cohortInfo,
          userName: userName,
        };
        const res = await createCohortDefinition(
          cohortDefinition,
          authorization
        );
        if (!res) {
          throw new Error(
            `Failed to create cohort definition in D2E with provided ${res}`
          );
        }
        content = [
          {
            type: "text",
            text: `${logMessage} ${res.id} Name: ${res.name}`,
          },
        ];
        break;
      }
      case "get": {
        const res = await getCohortDefinition(cohortId as number);
        content = [
          {
            type: "text",
            text: `${logMessage} ${res.id}`,
          },
        ];
        console.log("Cohort Definition fetched:", res);
        structuredContent = { cohortRetrieved: res };
        break;
      }
      case "update": {
        console.log("Updating cohort with data:", cohort);
        const res = await updateCohortDefinition(cohort, authorization);
        content = [
          {
            type: "text",
            text: `${logMessage} ${res.id}`,
          },
        ];
        break;
      }
      case "delete": {
        const res = await deleteCohortDefinition(
          cohortId as number,
          authorization,
          datasetId as string
        );
        console.log("Deleting cohort with cohort ID:", cohortId);
        if (!res) {
          throw new Error(
            `Failed to delete cohort definition in D2E with cohortId: ${cohortId}`
          );
        }

        content = [
          {
            type: "text",
            text: `${logMessage} ${cohortId}`,
          },
        ];
        break;
      }
      default: {
        throw new Error(`Unknown action: ${action}`);
      }
    }
    return {
      content: content,
      structuredContent: structuredContent,
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
