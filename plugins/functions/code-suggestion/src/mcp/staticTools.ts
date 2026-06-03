import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { env } from "../env";

async function callMcpTool(
  toolName: string,
  args: Record<string, any>,
  headers: Record<string, string>,
): Promise<string> {
  try {
    const url = env.SERVICE_ROUTES["mcp-server"];
    const options = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        host: new URL(url).host, // host is added, StreamableHTTPServerTransport.handleRequest uses getRequestListener from @hono/node-server which checks host header, otherwise will return 400 bad request error.
        ...headers,
      },
    };

    const body = JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 1,
      params: { name: toolName, arguments: args },
    });

    const response = await Trex.tokioChannel("d2e-functions/mcp-server").post(
      url,
      body,
      options,
    );

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `MCP server error: ${response.status} ${response.statusText}`,
      );
    }

    const data = response.data;

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
  } catch (error) {
    console.error(`Error calling MCP tool ${toolName}:`, error);
    throw error;
  }
}

/**
 * Creates all 17 MCP tools as static DynamicStructuredTool instances.
 * Schemas and descriptions match mcp-server/src/types/tool-schemas.ts and mcp-server/src/tools/*.tools.ts exactly.
 * This eliminates the 3-request MCP handshake (~3s) that getTools() requires.
 *
 * TODO: revisit static vs dynamic tool discovery. If switching back to
 * dynamic getTools(), delete this entire mirror.
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
      "Search for phenotypes by medical condition name to find their IDs and definitions. When user asks for a phenotype ID (e.g., 'phenotype ID of diabetes'), extract the condition name ('diabetes') and use it as searchTerm. Returns phenotype IDs, names, and logic descriptions from OHDSI Phenotype Library. Supports semantic search for finding conceptually similar phenotypes.",
      z.object({
        searchTerm: z
          .string()
          .describe(
            "The phenotype name or medical condition to search for (e.g., 'lung cancer', 'diabetes'). Extract the medical condition from the user's query. Leave empty only to return all phenotypes.",
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
    // ==================== Concept Set Management Tools (DATA-651) ====================
    mcpTool(
      "list_concept_sets",
      "List all concept sets in the current dataset that the user owns or that are shared. Returns id, name, shared flag, last-modified date. Pages to 50 items; if more exist, the response asks the user to narrow.",
      z.object({}),
    ),
    mcpTool(
      "get_concept_set",
      "Get one concept set by ID. Returns the SAVED definition: name, shared, and the concept expression (rule with descendants/excludes flags). Does NOT return the resolved concept-id list — call get_included_concepts for that.",
      z.object({
        conceptSetId: z.number().describe("The concept set ID to retrieve"),
      }),
    ),
    mcpTool(
      "create_concept_set",
      "Create a new private concept set from a list of OMOP concepts. Use preview_concept_set_resolution first to validate the expression with the user. Returns the new concept set ID. Defaults to private (shared=false).",
      z.object({
        name: z
          .string()
          .min(1)
          .describe("Unique name for the concept set within this dataset"),
        concepts: z
          .array(
            z.object({
              id: z.number().describe("OMOP concept ID"),
              useDescendants: z.boolean().describe("Include all descendant concepts"),
              useMapped: z.boolean().describe("Include mapped concepts"),
              isExcluded: z.boolean().describe("Exclude this concept and its descendants"),
            }),
          )
          .describe("List of OMOP concept items that define the set"),
      }),
    ),
    mcpTool(
      "check_concept_coverage_in_dataset",
      "Check which OMOP concept IDs exist in this dataset's vocabulary cache. Returns found and missing IDs. Use this before create_concept_set to inform the user which concepts have data in this dataset.",
      z.object({
        conceptIds: z
          .array(z.number())
          .describe("List of OMOP concept IDs to check against this dataset's vocabulary cache"),
      }),
    ),
  ];
}
