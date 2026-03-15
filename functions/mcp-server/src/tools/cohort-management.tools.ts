import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebAPIAPI } from "../api/WebAPIAPI";
import {
  GetCohortIdNameListInput,
  GetCohortDefinitionInput,
  CreateCohortDefinitionInput,
  UpdateCohortDefinitionInput,
  DeleteCohortDefinitionInput,
  CohortIdNameOutput,
} from "../types/tool-schemas";
import {
  requireAuth,
  requireAuthAndDataset,
  createStructuredResponse,
  createTextResponse,
} from "../utils/request-helpers";

// Initialize d2e-WebAPI client
const d2eWebapi = new WebAPIAPI();

/**
 * Register all cohort management tools (CRUD operations + list)
 * - get_cohort_id_name_list (full list includes bookmarks, requires auth + datasetId)
 * - get_atlas_cohort_definition (no auth)
 * - create_atlas_cohort_definition (requires auth)
 * - update_atlas_cohort_definition (no auth)
 * - delete_atlas_cohort_definition (requires auth + datasetId)
 */
export function registerCohortManagementTools(server: McpServer) {
  // ==================== GET COHORT ID AND NAME LIST ====================
  server.registerTool(
    "get_cohort_id_name_list",
    {
      title: "Get Cohort ID and Name List",
      description:
        "Rank the cohort ids and names for the relevant cohort description extracted from the user query. Return the list of cohort ids and names in structured content. Automatically invoked when user query is related to cohort id information.",
      inputSchema: GetCohortIdNameListInput,
      outputSchema: {
        cohortsId: CohortIdNameOutput.array(),
      },
    },
    async ({}, { requestInfo }) => {
      const toolStart = performance.now();
      // Extract authorization and datasetId (both required for delete)
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      // Fetch d2e cohort list
      const data = await d2eWebapi.getAtlasCohortDefinitionList(
        authorization,
        datasetId
      );
      const cohortData = (data as any[]).map((cohort) => ({
        cohortId: String(cohort.id ?? cohort.bmkId ?? ""),
        cohortName: String(cohort.name ?? cohort.bookmarkname ?? ""),
        cohortDescription: cohort.description || "",
      }));
      console.log(`[MCP-TIMING] [get_cohort_id_name_list] END total=${(performance.now() - toolStart).toFixed(1)}ms items=${cohortData.length}`);
      return createStructuredResponse(
        "Here is the list of cohort ids and names for all cohort description.",
        { cohortsId: cohortData }
      );
    }
  );

  // ==================== GET COHORT ====================
  server.registerTool(
    "get_atlas_cohort_definition",
    {
      title: "Get Atlas Cohort Definition",
      description:
        "Retrieve an existing ATLAS cohort definition from D2E by its ID.",
      inputSchema: GetCohortDefinitionInput,
    },
    async ({ cohortId }) => {
      const toolStart = performance.now();
      const cohortDefinition =
        await d2eWebapi.getAtlasCohortDefinition(cohortId);
      console.log(
        `[MCP-TIMING] [get_atlas_cohort_definition] END total=${(performance.now() - toolStart).toFixed(1)}ms`,
      );
      return createStructuredResponse(
        `Retrieved cohort definition with ID: ${cohortDefinition.id}, Name: ${cohortDefinition.name}`,
        { cohortDefinition }
      );
    }
  );

  // ==================== CREATE COHORT ====================
  server.registerTool(
    "create_atlas_cohort_definition",
    {
      title: "Create Atlas Cohort Definition",
      description:
        "Create a new ATLAS cohort definition in D2E. The cohort definition must be validated first using validate_atlas_cohort_definition tool.",
      inputSchema: CreateCohortDefinitionInput,
    },
    async (
      { cohortDefinitionExpression, cohortInfo, isValidCohortDefinition },
      { requestInfo }
    ) => {
      const toolStart = performance.now();
      if (!isValidCohortDefinition) {
        throw new Error(
          "Cohort definition must be validated before creation. Use validate_atlas_cohort_definition tool first and set isValidCohortDefinition=true"
        );
      }

      // Extract authorization (required for create)
      const authorization = requireAuth(requestInfo);

      const cohortDefinition = {
        expression: cohortDefinitionExpression,
        cohortInfo: cohortInfo,
      };

      const res = await d2eWebapi.createAtlasCohortDefinition(
        cohortDefinition,
        authorization
      );
      if (!res) {
        throw new Error("Failed to create cohort definition in D2E");
      }

      console.log(`[MCP-TIMING] [create_atlas_cohort_definition] END total=${(performance.now() - toolStart).toFixed(1)}ms`);
      return createTextResponse(
        `Successfully created cohort definition with ID: ${res.id}, Name: ${res.name}`
      );
    }
  );

  // ==================== UPDATE COHORT ====================
  server.registerTool(
    "update_atlas_cohort_definition",
    {
      title: "Update Atlas Cohort Definition",
      description:
        "The cohort definition must be validated first using validate_atlas_cohort_definition tool. Update an existing ATLAS cohort definition in D2E, and creation metadata is preserved. ",
      inputSchema: UpdateCohortDefinitionInput,
    },
    async (
      {
        cohortId,
        cohortDescription,
        cohortDefinitionExpression,
        isValidCohortDefinition,
      },
      { requestInfo }
    ) => {
      const toolStart = performance.now();
      if (!isValidCohortDefinition) {
        throw new Error(
          "Cohort definition must be validated before update. Use validate_atlas_cohort_definition tool first and set isValidCohortDefinition=true"
        );
      }

      // Extract authorization (required for user update)
      const authorization = requireAuth(requestInfo);

      // Fetch original cohort definition to preserve name, createdBy, createdDate
      const orgCohortDefinition = await d2eWebapi.getAtlasCohortDefinition(
        cohortId
      );

      const cohortDefinition = {
        cohortId: cohortId,
        name: orgCohortDefinition.name,
        description: cohortDescription,
        createdBy: orgCohortDefinition.createdBy,
        createdDate: orgCohortDefinition.createdDate,
        expression: cohortDefinitionExpression,
      };

      const res = await d2eWebapi.updateAtlasCohortDefinition(
        cohortDefinition,
        authorization
      );
      if (!res) {
        throw new Error(
          `Failed to update cohort definition in D2E with cohortId: ${cohortId}`
        );
      }

      console.log(
        `[MCP-TIMING] [update_atlas_cohort_definition] END total=${(performance.now() - toolStart).toFixed(1)}ms`,
      );
      return createTextResponse(
        `Successfully updated cohort definition with ID: ${res.id}`
      );
    }
  );

  // ==================== DELETE COHORT ====================
  server.registerTool(
    "delete_atlas_cohort_definition",
    {
      title: "Delete Atlas Cohort Definition",
      description:
        "Delete an ATLAS cohort definition from D2E by its ID. This action cannot be undone.",
      inputSchema: DeleteCohortDefinitionInput,
    },
    async ({ cohortId }, { requestInfo }) => {
      const toolStart = performance.now();
      // Extract authorization and datasetId (both required for delete)
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      const res = await d2eWebapi.deleteAtlasCohortDefinition(
        cohortId,
        authorization,
        datasetId
      );

      if (!res) {
        throw new Error(
          `Failed to delete cohort definition in D2E with cohortId: ${cohortId}`
        );
      }

      console.log(
        `[MCP-TIMING] [delete_atlas_cohort_definition] END total=${(performance.now() - toolStart).toFixed(1)}ms`,
      );
      return createTextResponse(
        `Successfully deleted cohort definition with ID: ${cohortId}`
      );
    }
  );
}
