import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchPhenotypeData,
  fetchCohortDefinitionTemplate,
} from "../utils/utils";

/**
 * Register phenotype library tools
 * - search_phenotype_library (no auth)
 * - fetch_templates_for_cohort_generation (no auth)
 *
 * Both tools interact with OHDSI Phenotype Library external API
 */
export function registerPhenotypeLibraryTools(server: McpServer) {
  // ==================== SEARCH PHENOTYPE LIBRARY ====================
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

  // ==================== FETCH TEMPLATES FOR COHORT GENERATION ====================
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
}
