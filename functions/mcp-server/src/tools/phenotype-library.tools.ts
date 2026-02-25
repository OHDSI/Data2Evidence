import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchCohortDefinitionTemplate,
  searchPhenotypes,
} from "../utils/phenotype-helpers";
import {
  SearchPhenotypeLibraryInput,
  FetchTemplatesInput,
} from "../types/tool-schemas";
import { createStructuredResponse } from "../utils/request-helpers";

/**
 * Register phenotype library tools
 * - search_phenotype_library (no auth)
 * - fetch_templates_for_cohort_generation (no auth)
 */
export function registerPhenotypeLibraryTools(server: McpServer) {
  // ==================== SEARCH PHENOTYPE LIBRARY ====================
  server.registerTool(
    "search_phenotype_library",
    {
      title: "Search OHDSI Phenotype Library",
      description:
        "Search for phenotypes by medical condition name to find their IDs and definitions. When user asks for a phenotype ID (e.g., 'phenotype ID of diabetes'), extract the condition name ('diabetes') and use it as searchTerm. Returns phenotype IDs, names, and logic descriptions from OHDSI Phenotype Library. Supports semantic search for finding conceptually similar phenotypes.",
      inputSchema: SearchPhenotypeLibraryInput,
    },
    async ({ searchTerm, useSemanticSearch = true, topK = 5 }) => {
      try {
        const phenotypeData = await searchPhenotypes(
          searchTerm,
          useSemanticSearch,
          topK,
        );

        const message = searchTerm
          ? `Found ${phenotypeData.length} phenotype(s) ${useSemanticSearch ? "semantically similar to" : "matching"} "${searchTerm}". Analyze this list to identify relevant phenotype IDs for the cohort definition.`
          : "Retrieved all phenotypes. Analyze this list to identify relevant phenotype IDs for the cohort definition.";

        return createStructuredResponse(message, { phenotypes: phenotypeData });
      } catch (error) {
        // If semantic search fails (no embeddings), fallback to substring search
        if (
          useSemanticSearch &&
          error instanceof Error &&
          error.message.includes("cache not found")
        ) {
          console.warn(
            "[search_phenotype_library] Embeddings not found, falling back to substring search",
          );
          const phenotypeData = await searchPhenotypes(searchTerm, false, topK);
          return createStructuredResponse(
            `Found ${phenotypeData.length} phenotype(s) using substring matching. For better results, configure semantic search by generating embeddings (developer task).`,
            { phenotypes: phenotypeData },
          );
        }
        throw error;
      }
    },
  );

  // ==================== FETCH TEMPLATES FOR COHORT GENERATION ====================
  server.registerTool(
    "fetch_templates_for_cohort_generation",
    {
      title: "Fetch Cohort Templates for Generation",
      description:
        "Fetches ATLAS cohort definition templates from OHDSI Phenotype Library for specified phenotype ID. The template serve as example to create a new cohort definition.",
      inputSchema: FetchTemplatesInput,
    },
    async ({ phenotypeId, userCohortDescription }) => {
      const toolStart = performance.now();
      const t0 = performance.now();
      // Fetch templates for the selected phenotype ID
      const template = await fetchCohortDefinitionTemplate(phenotypeId);
      console.log(
        `[MCP-TIMING] [fetch_templates_for_cohort_generation] END total=${(performance.now() - toolStart).toFixed(1)}ms`,
      );
      return createStructuredResponse(
        `Fetched cohort definition template. User Requirements: ${userCohortDescription} Example Templates Retrieved: - Phenotype ID ${phenotypeId}. Continue to generate a complete ATLAS cohort definition JSON using these templates as structural examples.`,
        {
          userRequirements: userCohortDescription,
          exampleTemplates: template,
        },
      );
    },
  );
}
