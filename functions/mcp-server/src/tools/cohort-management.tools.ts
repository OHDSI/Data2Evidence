import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getCohortDefinition,
  createCohortDefinition,
  updateCohortDefinition,
  deleteCohortDefinition,
  fetchCohortData,
} from "../utils/utils";

/**
 * Register all cohort management tools (CRUD operations + list)
 * - get_cohort_id_name_list (no auth)
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
      inputSchema: {
        cohortInfo: z
          .string()
          .describe("The cohort description extracted from user query"),
      },
      outputSchema: {
        cohortsId: z.array(
          z.object({
            cohortId: z.string(),
            cohortName: z.string(),
            cohortDescription: z.string(),
          })
        ),
      },
    },
    async ({}) => {
      // Fetch d2e cohort list
      const cohortData = await fetchCohortData();
      return {
        content: [
          {
            type: "text",
            text: `Here is the list of cohort ids and names for all cohort description.`,
          },
        ],
        structuredContent: {
          cohortsId: cohortData,
        },
      };
    }
  );

  // ==================== GET COHORT ====================
  server.registerTool(
    "get_atlas_cohort_definition",
    {
      title: "Get Atlas Cohort Definition",
      description:
        "Retrieve an existing ATLAS cohort definition from D2E by its ID.",
      inputSchema: {
        cohortId: z.number().describe("The cohort ID to retrieve"),
      },
    },
    async ({ cohortId }) => {
      const cohortDefinition = await getCohortDefinition(cohortId);
      return {
        content: [
          {
            type: "text",
            text: `Retrieved cohort definition with ID: ${cohortDefinition.id}, Name: ${cohortDefinition.name}`,
          },
        ],
        structuredContent: { cohortDefinition },
      };
    }
  );

  // ==================== CREATE COHORT ====================
  server.registerTool(
    "create_atlas_cohort_definition",
    {
      title: "Create Atlas Cohort Definition",
      description:
        "Create a new ATLAS cohort definition in D2E. The cohort definition must be validated first using validate_atlas_cohort_definition tool.",
      inputSchema: {
        cohortDefinitionExpression: z
          .any()
          .describe(
            "The validated ATLAS cohort definition JSON including concept sets and expression"
          ),
        cohortInfo: z.string().describe("The cohort description"),
        userName: z.string().describe("User name creating the cohort"),
        isValidCohortDefinition: z
          .boolean()
          .describe(
            "Must be true. Set after validating with validate_atlas_cohort_definition tool"
          )
          .default(false),
      },
    },
    async (
      {
        cohortDefinitionExpression,
        cohortInfo,
        userName,
        isValidCohortDefinition,
      },
      { requestInfo }
    ) => {
      if (!isValidCohortDefinition) {
        throw new Error(
          "Cohort definition must be validated before creation. Use validate_atlas_cohort_definition tool first and set isValidCohortDefinition=true"
        );
      }

      // Extract authorization (required for create)
      let authorization = requestInfo?.headers?.authorization;
      if (!authorization) {
        throw new Error("Authorization is missing");
      }
      authorization = String(authorization);

      const cohortDefinition = {
        expression: cohortDefinitionExpression,
        cohortInfo: cohortInfo,
        userName: userName,
      };

      const res = await createCohortDefinition(cohortDefinition, authorization);
      if (!res) {
        throw new Error("Failed to create cohort definition in D2E");
      }

      return {
        content: [
          {
            type: "text",
            text: `Successfully created cohort definition with ID: ${res.id}, Name: ${res.name}`,
          },
        ],
      };
    }
  );

  // ==================== UPDATE COHORT ====================
  server.registerTool(
    "update_atlas_cohort_definition",
    {
      title: "Update Atlas Cohort Definition",
      description:
        "The cohort definition must be validated first using validate_atlas_cohort_definition tool. Update an existing ATLAS cohort definition in D2E, and creation metadata is preserved. ",
      inputSchema: {
        cohortDefinitionExpression: z
          .any()
          .describe(
            "The validated ATLAS cohort definition JSON including concept sets and expression"
          ),
        userName: z.string().describe("User name updating the cohort"),
        isValidCohortDefinition: z
          .boolean()
          .describe(
            "Set after validating with validate_atlas_cohort_definition tool"
          )
          .default(false),
        cohortId: z.number().describe("The cohort ID to update"),
        cohortDescription: z
          .string()
          .describe("The cohort description to update"),
      },
    },
    async ({
      cohortId,
      cohortDescription,
      cohortDefinitionExpression,
      userName,
      isValidCohortDefinition,
    }) => {
      if (!isValidCohortDefinition) {
        throw new Error(
          "Cohort definition must be validated before update. Use validate_atlas_cohort_definition tool first and set isValidCohortDefinition=true"
        );
      }

      // Fetch original cohort definition to preserve name, createdBy, createdDate
      const orgCohortDefinition = await getCohortDefinition(cohortId);

      const cohortDefinition = {
        cohortId: cohortId,
        name: orgCohortDefinition.name,
        description: cohortDescription,
        createdBy: orgCohortDefinition.createdBy,
        createdDate: orgCohortDefinition.createdDate,
        expression: cohortDefinitionExpression,
        userName: userName,
      };

      const res = await updateCohortDefinition(cohortDefinition);
      if (!res) {
        throw new Error(
          `Failed to update cohort definition in D2E with cohortId: ${cohortId}`
        );
      }

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated cohort definition with ID: ${res.id}`,
          },
        ],
      };
    }
  );

  // ==================== DELETE COHORT ====================
  server.registerTool(
    "delete_atlas_cohort_definition",
    {
      title: "Delete Atlas Cohort Definition",
      description:
        "Delete an ATLAS cohort definition from D2E by its ID. This action cannot be undone.",
      inputSchema: {
        cohortId: z.number().describe("The cohort ID to delete"),
      },
    },
    async ({ cohortId }, { requestInfo }) => {
      // Extract authorization and datasetId (both required for delete)
      let authorization = requestInfo?.headers?.authorization;
      let datasetId = requestInfo?.headers?.datasetid;

      if (!authorization || !datasetId) {
        throw new Error("Authorization or datasetId is missing");
      }
      authorization = String(authorization);

      const res = await deleteCohortDefinition(
        cohortId,
        authorization,
        datasetId as string
      );

      if (!res) {
        throw new Error(
          `Failed to delete cohort definition in D2E with cohortId: ${cohortId}`
        );
      }

      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted cohort definition with ID: ${cohortId}`,
          },
        ],
      };
    }
  );
}
