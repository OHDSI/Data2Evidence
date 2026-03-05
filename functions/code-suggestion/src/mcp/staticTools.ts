import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { env } from "../env";

async function callMcpTool(
  toolName: string,
  args: Record<string, any>,
  headers: Record<string, string>,
): Promise<string> {
  const url = env.SERVICE_ROUTES["mcp-server"];
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 1,
      params: { name: toolName, arguments: args },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `MCP server error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      `MCP tool error: ${data.error.message || JSON.stringify(data.error)}`,
    );
  }

  const result = data.result;
  const parts: string[] = [];

  // Extract text from content array
  if (Array.isArray(result?.content)) {
    for (const c of result.content) {
      if (c.type === "text" && c.text) parts.push(c.text);
    }
  }

  // Extract structuredContent (contains the actual tool data)
  if (result?.structuredContent) {
    parts.push(JSON.stringify(result.structuredContent));
  }

  return parts.length > 0 ? parts.join("\n") : JSON.stringify(result);
}

/**
 * Creates all 13 MCP tools as static DynamicStructuredTool instances.
 * Schemas and descriptions match mcp-server/src/types/tool-schemas.ts and mcp-server/src/tools/*.tools.ts exactly.
 * This eliminates the 3-request MCP handshake (~3s) that getTools() requires.
 */
export function createStaticMcpTools(
  token?: string,
  datasetId?: string,
): DynamicStructuredTool[] {
  const headers: Record<string, string> = {
    Authorization: token || "",
    datasetId: datasetId || "",
  };

  const mcpTool = (
    name: string,
    description: string,
    schema: z.ZodObject<any>,
  ) =>
    new DynamicStructuredTool({
      name,
      description,
      schema,
      func: async (args) => callMcpTool(name, args, headers),
    });

  return [
    // ==================== Cohort Management Tools ====================
    mcpTool(
      "get_cohort_id_name_list",
      "Rank the cohort ids and names for the relevant cohort description extracted from the user query. Return the list of cohort ids and names in structured content. Automatically invoked when user query is related to cohort id information.",
      z.object({
        cohortInfo: z
          .string()
          .describe("The cohort description extracted from user query"),
      }),
    ),
    mcpTool(
      "get_atlas_cohort_definition",
      "Retrieve an existing ATLAS cohort definition from D2E by its ID.",
      z.object({
        cohortId: z.number().describe("The cohort ID to retrieve"),
      }),
    ),
    mcpTool(
      "create_atlas_cohort_definition",
      "Create a new ATLAS cohort definition in D2E. The cohort definition must be validated first using validate_atlas_cohort_definition tool.",
      z.object({
        cohortDefinitionExpression: z
          .any()
          .describe(
            "The validated ATLAS cohort definition JSON including concept sets and expression",
          ),
        cohortInfo: z.string().describe("The cohort description"),
        isValidCohortDefinition: z
          .boolean()
          .describe(
            "Must be true. Set after validating with validate_atlas_cohort_definition tool",
          )
          .default(false),
      }),
    ),
    mcpTool(
      "update_atlas_cohort_definition",
      "The cohort definition must be validated first using validate_atlas_cohort_definition tool. Update an existing ATLAS cohort definition in D2E, and creation metadata is preserved.",
      z.object({
        cohortDefinitionExpression: z
          .any()
          .describe(
            "The validated ATLAS cohort definition JSON including concept sets and expression",
          ),
        isValidCohortDefinition: z
          .boolean()
          .describe(
            "Set after validating with validate_atlas_cohort_definition tool",
          )
          .default(false),
        cohortId: z.number().describe("The cohort ID to update"),
        cohortDescription: z
          .string()
          .describe("The cohort description to update"),
      }),
    ),
    mcpTool(
      "delete_atlas_cohort_definition",
      "Delete an ATLAS cohort definition from D2E by its ID. This action cannot be undone.",
      z.object({
        cohortId: z.number().describe("The cohort ID to delete"),
      }),
    ),
    // ==================== Phenotype Library Tools ====================
    mcpTool(
      "search_phenotype_library",
      "Return phenotypes from OHDSI Phenotype Library with IDs, names, and logic descriptions. Use this to find phenotype IDs that are relevant to the user's cohort requirements.",
      z.object({
        searchTerm: z
          .string()
          .describe(
            "The phenotype name or medical condition to search for (e.g., 'bronchiolitis', 'diabetes'). Leave empty only to return all phenotypes.",
          ),
        useSemanticSearch: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "If true, use embedding-based semantic search (finds conceptually similar phenotypes). If false, use simple substring matching. Default: true.",
          ),
        topK: z
          .number()
          .optional()
          .default(5)
          .describe(
            "Number of top results to return for semantic search. Default: 5.",
          ),
      }),
    ),
    mcpTool(
      "fetch_templates_for_cohort_generation",
      "Fetches ATLAS cohort definition templates from OHDSI Phenotype Library for specified phenotype ID. The template serve as example to create a new cohort definition.",
      z.object({
        phenotypeId: z
          .number()
          .describe("Most relevant phenotype ID to use as template examples"),
        userCohortDescription: z
          .string()
          .describe("The user's description of the cohort they want to create"),
      }),
    ),
    // ==================== Validation Tool ====================
    mcpTool(
      "validate_atlas_cohort_definition",
      "Must be called before calling creating or updating cohorts tools. Validate Atlas cohort definition JSON and return warnings for LLM analysis.",
      z.object({
        cohortDefinitionExpression: z
          .any()
          .describe(
            "Atlas cohort definition in json to be validated, include concept sets and expression",
          ),
        userName: z.string().describe("User name creating/updating the cohort"),
      }),
    ),
    // ==================== Instruction Tools ====================
    mcpTool(
      "before_cohort_definition_generation",
      "You MUST call this tool before creating a cohort definition. It provides the mandatory instructions for cohort definition generation.",
      z.object({
        cohortDescription: z
          .string()
          .describe("User's description of the desired cohort"),
      }),
    ),
    mcpTool(
      "before_cohort_definition_update",
      "MANDATORY first step when user wants to update an existing cohort definition. Returns the required step-by-step workflow (validate, confirm, update). You MUST call this tool BEFORE calling update_atlas_cohort_definition.",
      z.object({
        cohortDescription: z
          .string()
          .describe("User's description of the desired cohort"),
      }),
    ),
    // ==================== Strategus Tools ====================
    mcpTool(
      "strategus_list_modules",
      `Retrieve a list of all available OHDSI Strategus R modules.
    Each module corresponds to an analytic component used in the Strategus study pipeline
    (e.g., Characterization, CohortMethod, PatientLevelPrediction, etc.).
    Returns each module's name and a brief description.`,
      z.object({}),
    ),
    mcpTool(
      "strategus_initial_instructions",
      `This tool provides the mandatory initial system instructions to be used for any Strategus-related
    query. It must always be applied first, before any other tool or query, and provides the foundational
    guidelines and context for generating R code using OHDSI's Strategus framework.`,
      z.object({}),
    ),
    mcpTool(
      "strategus_reference_code_template",
      ` This template contains sample code for many Strategus modules and their settings.
    It is one example of how a specification file looks like.
      `,
      z.object({}),
    ),
  ];
}
