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
  validateCohortDefinition,
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
            1. Get available phenotypes by calling **search_phenotype_library**
            2. Identify a most relevant phenotype ID from 1 that closely matches the cohort description.
            3. Fetch cohort definition template with phenotype ID from 2 using tool **fetch_templates_for_cohort_generation**
            4. Looking at the template from 3 carefully, only use valid syntax (those exist in template), understand the cohort description, based on template and cohort information, draft and output a complete and valid ATLAS cohort definition in JSON format, without any additional explanation and without generating new file. Double check to make sure the syntax is valid ATLAS JSON format.
            5. Validate the generated cohort definition JSON using tool **validate_atlas_cohort_definition**. If there are warnings, analyze the warnings, decide whether to fix the definition or proceed. .
            6. Wait for user's confirmation for next action, your question of "create in D2E" with "y" or "yes". If proceed to create the cohort definition in D2E, set parameter "isValidCohortDefinition" to true and call tool **create_atlas_cohort_definition**`,
        },
      ],
    };
  }
);

// Tool to instruct ATLAS cohort definition creation in D2E
server.registerTool(
  "before_cohort_definition_update",
  {
    title: "Instruction to Update Cohort Definition",
    description:
      "Must follow this instruction before update cohort definition.",
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

          Strictly follow to-do list below for update of ATLAS cohort definition:
            1. Validate the updated cohort definition JSON using tool **validate_atlas_cohort_definition**. If there are warnings, analyze the warnings, decide whether to fix the definition or proceed. .
            2. Wait for user's confirmation for next action, your question of "update in D2E" with "y" or "yes". If proceed to update the cohort definition in D2E, set parameter "isValidCohortDefinition" to true and call tool **update_atlas_cohort_definition**`,
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

// Tool to validate ATLAS cohort definition before create/update
server.registerTool(
  "validate_atlas_cohort_definition",
  {
    title: "Validate Atlas Cohort Definition",
    description:
      "Must be called before calling creating or updating cohorts tools. Validate Atlas cohort definition JSON and return warnings for LLM analysis.",
    inputSchema: {
      cohortDefinitionExpression: z
        .any()
        .describe(
          "Atlas cohort definition in json to be validated, include concept sets and expression"
        ),
      userName: z.string().describe("User name creating/updating the cohort"),
    },
  },
  async ({ cohortDefinitionExpression }, { requestInfo }) => {
    // Validate the cohort definition via D2E WebAPI, authorization and datasetId are required in headers although through Trex.tokioChannel
    let authorization = requestInfo?.headers?.authorization;
    let datasetId = requestInfo?.headers?.datasetid;
    console.log("DatasetId:", datasetId);
    if (!authorization || !datasetId) {
      throw new Error("Authorization or datasetId is missing");
    }
    authorization = String(authorization);
    const validationResult = await validateCohortDefinition(
      cohortDefinitionExpression,
      authorization,
      datasetId as string
    );
    if (!validationResult) {
      throw new Error("Failed to validate cohort definition in D2E");
    }
    const warnings = validationResult?.warnings || [];
    console.log("Validation Result:", JSON.stringify(validationResult));
    return {
      content: [
        {
          type: "text",
          text:
            warnings.length > 0
              ? `Validation completed with ${
                  warnings.length
                } warning(s). Analyze these and decide whether to fix the definition or proceed with create.\n\nWarnings:\n${JSON.stringify(
                  warnings,
                  null,
                  2
                )}`
              : "Validation passed with no warnings. Safe to proceed with create by setting isValidCohortDefinition=true.",
        },
      ],
      structuredContent: { validationResult },
    };
  }
);

// Tool to get ATLAS cohort definition from D2E
server.registerTool(
  "get_atlas_cohort_definition",
  {
    title: "Get Atlas Cohort Definition",
    description:
      "Retrieve an existing ATLAS cohort definition from D2E by its ID.",
    inputSchema: {
      cohortId: z.number().describe("The cohort ID to retrieve"),
    },
  },
  async ({ cohortId }) => {
    const cohortDefinition = await getCohortDefinition(cohortId);
    return {
      content: [
        {
          type: "text",
          text: `Retrieved cohort definition with ID: ${cohortDefinition.id}, Name: ${cohortDefinition.name}`,
        },
      ],
      structuredContent: { cohortDefinition },
    };
  }
);

// Tool to create ATLAS cohort definition in D2E
server.registerTool(
  "create_atlas_cohort_definition",
  {
    title: "Create Atlas Cohort Definition",
    description:
      "Create a new ATLAS cohort definition in D2E. The cohort definition must be validated first using validate_atlas_cohort_definition tool.",
    inputSchema: {
      cohortDefinitionExpression: z
        .any()
        .describe(
          "The validated ATLAS cohort definition JSON including concept sets and expression"
        ),
      cohortInfo: z.string().describe("The cohort description"),
      userName: z.string().describe("User name creating the cohort"),
      isValidCohortDefinition: z
        .boolean()
        .describe(
          "Must be true. Set after validating with validate_atlas_cohort_definition tool"
        )
        .default(false),
    },
  },
  async (
    {
      cohortDefinitionExpression,
      cohortInfo,
      userName,
      isValidCohortDefinition,
    },
    { requestInfo }
  ) => {
    if (!isValidCohortDefinition) {
      throw new Error(
        "Cohort definition must be validated before creation. Use validate_atlas_cohort_definition tool first and set isValidCohortDefinition=true"
      );
    }
    let authorization = requestInfo?.headers?.authorization; // valid JWT token is required to create cohort in D2E although through Trex.tokioChannel
    if (!authorization) {
      throw new Error("Authorization is missing");
    }
    authorization = String(authorization);
    const cohortDefinition = {
      expression: cohortDefinitionExpression,
      cohortInfo: cohortInfo,
      userName: userName,
    };

    const res = await createCohortDefinition(cohortDefinition, authorization);
    if (!res) {
      throw new Error("Failed to create cohort definition in D2E");
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully created cohort definition with ID: ${res.id}, Name: ${res.name}`,
        },
      ],
    };
  }
);

// Tool to update ATLAS cohort definition in D2E
server.registerTool(
  "update_atlas_cohort_definition",
  {
    title: "Update Atlas Cohort Definition",
    description:
      "The cohort definition must be validated first using validate_atlas_cohort_definition tool. Update an existing ATLAS cohort definition in D2E, and creation metadata are preserved. ",
    inputSchema: {
      cohortDefinitionExpression: z
        .any()
        .describe(
          "The validated ATLAS cohort definition JSON including concept sets and expression"
        ),
      userName: z.string().describe("User name updating the cohort"),
      isValidCohortDefinition: z
        .boolean()
        .describe(
          "Set after validating with validate_atlas_cohort_definition tool"
        )
        .default(false),
      cohortId: z.number().describe("The cohort ID to update"),
      cohortDescription: z
        .string()
        .describe("The cohort description to update"),
    },
  },
  async ({
    cohortId,
    cohortDescription,
    cohortDefinitionExpression,
    userName,
    isValidCohortDefinition,
  }) => {
    if (!isValidCohortDefinition) {
      throw new Error(
        "Cohort definition must be validated before update. Use validate_atlas_cohort_definition tool first and set isValidCohortDefinition=true"
      );
    }

    // Fetch original cohort definition to preserve name, createdBy, createdDate
    const orgCohortDefinition = await getCohortDefinition(cohortId);

    const cohortDefinition = {
      cohortId: cohortId,
      name: orgCohortDefinition.name,
      description: cohortDescription,
      createdBy: orgCohortDefinition.createdBy,
      createdDate: orgCohortDefinition.createdDate,
      expression: cohortDefinitionExpression,
      userName: userName,
    };

    const res = await updateCohortDefinition(cohortDefinition);
    if (!res) {
      throw new Error(
        `Failed to update cohort definition in D2E with cohortId: ${cohortId}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated cohort definition with ID: ${res.id}`,
        },
      ],
    };
  }
);

// Tool to delete ATLAS cohort definition from D2E
server.registerTool(
  "delete_atlas_cohort_definition",
  {
    title: "Delete Atlas Cohort Definition",
    description:
      "Delete an ATLAS cohort definition from D2E by its ID. This action cannot be undone.",
    inputSchema: {
      cohortId: z.number().describe("The cohort ID to delete"),
    },
  },
  async ({ cohortId }, { requestInfo }) => {
    let authorization = requestInfo?.headers?.authorization;
    let datasetId = requestInfo?.headers?.datasetid;
    if (!authorization || !datasetId) {
      throw new Error("Authorization or datasetId is missing");
    }
    authorization = String(authorization);

    const res = await deleteCohortDefinition(
      cohortId,
      authorization,
      datasetId as string
    );

    if (!res) {
      throw new Error(
        `Failed to delete cohort definition in D2E with cohortId: ${cohortId}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted cohort definition with ID: ${cohortId}`,
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
