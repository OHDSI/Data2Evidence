import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CohortInstructionInput } from "../types/tool-schemas";
import { createTextResponse } from "../utils/request-helpers";

/**
 * Register cohort instruction tools
 * - before_cohort_definition_generation (no auth)
 * - before_cohort_definition_update (no auth)
 *
 * These tools provide step-by-step instructions for LLM to follow
 * when creating or updating cohort definitions
 */
export function registerCohortInstructionTools(server: McpServer) {
  // ==================== INSTRUCTION TO GENERATE COHORT DEFINITION ====================
  server.registerTool(
    "before_cohort_definition_generation",
    {
      title: "Instruction to Generate Cohort Definition",
      description:
        "Must follow this instruction before generate/create cohort definition.",
      inputSchema: CohortInstructionInput,
    },
    async ({ cohortDescription }) => {
      return createTextResponse(`
          cohort description: ${cohortDescription}

          Strictly follow to-do list below for creation of ATLAS cohort definition:
            1. Get available phenotypes by calling **search_phenotype_library**
            2. Identify a most relevant phenotype ID from 1 that closely matches the cohort description.
            3. Fetch cohort definition template with phenotype ID from 2 using tool **fetch_templates_for_cohort_generation**
            4. Looking at the template from 3 carefully, only use valid syntax (those exist in template), understand the cohort description, based on template and cohort information, draft and output a complete and valid ATLAS cohort definition in JSON format, without any additional explanation and without generating new file. Double check to make sure the syntax is valid ATLAS JSON format.
            5. Validate the generated cohort definition JSON using tool **validate_atlas_cohort_definition**. If there are warnings, analyze the warnings, decide whether to fix the definition or proceed.
            6. Wait for user's confirmation for next action, your question of "create in D2E" with "y" or "yes". If proceed to create the cohort definition in D2E, set parameter "isValidCohortDefinition" to true and call tool **create_atlas_cohort_definition**`);
    }
  );

  // ==================== INSTRUCTION TO UPDATE COHORT DEFINITION ====================
  server.registerTool(
    "before_cohort_definition_update",
    {
      title: "Instruction to Update Cohort Definition",
      description:
        "Must follow this instruction before update cohort definition.",
      inputSchema: CohortInstructionInput,
    },
    async ({ cohortDescription }) => {
      return createTextResponse(`
          cohort description: ${cohortDescription}

          Strictly follow to-do list below for update of ATLAS cohort definition:
            1. Validate the updated cohort definition JSON using tool **validate_atlas_cohort_definition**. If there are warnings, analyze the warnings, decide whether to fix the definition or proceed.
            2. Wait for user's confirmation for next action, your question of "update in D2E" with "y" or "yes". If proceed to update the cohort definition in D2E, set parameter "isValidCohortDefinition" to true and call tool **update_atlas_cohort_definition**`);
    }
  );
}
