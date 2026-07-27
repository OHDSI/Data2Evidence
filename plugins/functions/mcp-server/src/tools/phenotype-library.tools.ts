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
// The matches themselves, as text. A bare count is not something the model can pick
// an id from, and its only recourse is to re-search or invent one.
import { formatPhenotypeListing } from "../lib/toolText";

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
      // No outputSchema — see ../lib/toolText.ts. structuredContent does not reach
      // the model, which is why "Analyze this list" used to refer to a list it could
      // not see; the phenotypes are written into the text below instead.
    },
    async ({ searchTerm, useSemanticSearch = true, topK = 5 }) => {
      try {
        const toolStart = performance.now();
        const phenotypeData = await searchPhenotypes(
          searchTerm,
          useSemanticSearch,
          topK,
        );

        const message =
          (searchTerm
            ? `Found ${phenotypeData.length} phenotype(s) ${useSemanticSearch ? "semantically similar to" : "matching"} "${searchTerm}".`
            : "Retrieved all phenotypes.") +
          ` Pick the relevant phenotype id(s) from this list — these are the only ones that matched, so do ` +
          `not invent an id or re-run the same search.\n${formatPhenotypeListing(phenotypeData)}`;

        console.log(
          `[MCP-TIMING] [search_phenotype_library] END total=${(performance.now() - toolStart).toFixed(1)}ms`,
        );
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
            `Found ${phenotypeData.length} phenotype(s) using substring matching. For better results, configure ` +
              `semantic search by generating embeddings (developer task).\n${formatPhenotypeListing(phenotypeData)}`,
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
