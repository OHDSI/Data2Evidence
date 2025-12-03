import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { validateCohortDefinition } from "../utils/utils";

/**
 * Register cohort validation tools
 * - validate_atlas_cohort_definition (requires auth + datasetId)
 *
 * Validates cohort definitions before create/update operations
 */
export function registerCohortValidationTools(server: McpServer) {
  // ==================== VALIDATE ATLAS COHORT DEFINITION ====================
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
}
