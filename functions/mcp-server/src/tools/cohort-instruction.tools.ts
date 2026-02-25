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
            2. Identify all the relevant phenotype IDs (around 3) from step 1 that closely matches the cohort description.
            3. Fetch cohort definition template with the confirmed phenotype ID from step 2 using tool **fetch_templates_for_cohort_generation**
            4. Learning template from step 3 carefully, only use valid syntax (those exist in templates), understand the cohort description, based on templates and cohort information, draft and output a complete and valid ATLAS cohort definition in JSON format, without any additional explanation. Don't include any irrelevant concept sets or information that are not related to the cohort description. If there are multiple templates, analyze them and choose the most relevant one as the main reference for generation.
            5. Validate the generated cohort definition JSON using tool **validate_atlas_cohort_definition**. If there are warnings, analyze the warnings, decide whether to fix the definition or proceed. 
            6. You MUST output:
              a): The list of matching phenotypes with IDs and names from step 1
              b): Explain which phenotype you choose as the template and why
              c): The complete final JSON cohort definition in a JSON code block.
            7. After showing the JSON, must ask the user: "Would you like to create this cohort in D2E?" Wait for user's confirmation ("y" or "yes"). 
            8. Only with user confirmation, you can set parameter "isValidCohortDefinition" to true and call tool **create_atlas_cohort_definition**`);
    },
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
            2. You MUST output the complete final JSON cohort definition in a JSON code block.
            3. Wait for user's confirmation for next action, your question of "update in D2E" with "y" or "yes". If proceed to update the cohort definition in D2E, set parameter "isValidCohortDefinition" to true and call tool **update_atlas_cohort_definition**`);
    },
  );
}
