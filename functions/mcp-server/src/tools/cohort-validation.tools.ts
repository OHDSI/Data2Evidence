import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebAPIAPI } from "../api/WebAPIAPI";
import { ValidateCohortDefinitionInput } from "../types/tool-schemas";
import {
  requireAuthAndDataset,
  createStructuredResponse,
} from "../utils/request-helpers";

// Initialize WebAPI client
const d2eWebapi = new WebAPIAPI();

/**
 * Register cohort validation tools
 * - validate_atlas_cohort_definition (requires auth + datasetId)
 */
export function registerCohortValidationTools(server: McpServer) {
  // ==================== VALIDATE ATLAS COHORT DEFINITION ====================
  server.registerTool(
    "validate_atlas_cohort_definition",
    {
      title: "Validate Atlas Cohort Definition",
      description:
        "Must be called before calling creating or updating cohorts tools. Validate Atlas cohort definition JSON and return warnings for LLM analysis.",
      inputSchema: ValidateCohortDefinitionInput,
    },
    async ({ cohortDefinitionExpression }, { requestInfo }) => {
      // Validate the cohort definition via D2E WebAPI, authorization and datasetId are required
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      const validationResult = await d2eWebapi.checkAtlasCohortDefinition(
        cohortDefinitionExpression,
        authorization,
        datasetId
      );

      if (!validationResult) {
        throw new Error("Failed to validate cohort definition in D2E");
      }

      const warnings = validationResult?.warnings || [];
      const text =
        warnings.length > 0
          ? `Validation completed with ${
              warnings.length
            } warning(s). Analyze these and decide whether to fix the definition or proceed with create.\n\nWarnings:\n${JSON.stringify(
              warnings,
              null,
              2
            )}`
          : "Validation passed with no warnings. Safe to proceed with create by setting isValidCohortDefinition=true.";

      return createStructuredResponse(text, { validationResult });
    }
  );
}
