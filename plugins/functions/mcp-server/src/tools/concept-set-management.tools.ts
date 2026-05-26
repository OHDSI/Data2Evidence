import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TerminologyAPI } from "../api/TerminologyAPI";
import {
  ListConceptSetsInput,
  GetConceptSetInput,
  CreateConceptSetInput,
  UpdateConceptSetInput,
  DeleteConceptSetInput,
} from "../types/tool-schemas";
import {
  requireAuthAndDataset,
  createStructuredResponse,
  createTextResponse,
  getUserName,
} from "../utils/request-helpers";

const terminologyApi = new TerminologyAPI();

const LIST_PAGE_SIZE = 50;

/**
 * Register concept set CRUD tools.
 * - list_concept_sets   (paginated: first 50 + totalCount)
 * - get_concept_set     (returns saved definition + concept list)
 * - create_concept_set  (WEDGE — defaults shared=false)
 * - update_concept_set
 * - delete_concept_set
 */
export function registerConceptSetManagementTools(server: McpServer) {
  // ==================== LIST CONCEPT SETS ====================
  server.registerTool(
    "list_concept_sets",
    {
      title: "List Concept Sets",
      description:
        "List all concept sets in the current dataset that the user owns or that are shared. Returns id, name, shared flag, last-modified date. Pages to 50 items; if more exist, the response asks the user to narrow.",
      inputSchema: ListConceptSetsInput,
    },
    async ({}, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      const all = await terminologyApi.listConceptSets(authorization, datasetId);
      const totalCount = all.length;
      const page = all.slice(0, LIST_PAGE_SIZE).map((cs) => ({
        id: cs.id,
        name: cs.name,
        shared: cs.shared,
        modifiedDate: cs.modifiedDate,
      }));

      console.log(
        `[MCP-TIMING] [list_concept_sets] END total=${(performance.now() - toolStart).toFixed(1)}ms items=${page.length} totalCount=${totalCount}`
      );

      const text =
        totalCount > LIST_PAGE_SIZE
          ? `Showing ${LIST_PAGE_SIZE} of ${totalCount} concept sets. Ask the user to narrow by name or shared/private.`
          : `Found ${totalCount} concept set${totalCount === 1 ? "" : "s"} in this dataset.`;

      return createStructuredResponse(text, { conceptSets: page, totalCount });
    }
  );

  // ==================== GET CONCEPT SET ====================
  server.registerTool(
    "get_concept_set",
    {
      title: "Get Concept Set",
      description:
        "Get one concept set by ID. Returns the SAVED definition: name, shared, and the concept expression (rule with descendants/excludes flags). Does NOT return the resolved concept-id list — call get_included_concepts for that.",
      inputSchema: GetConceptSetInput,
    },
    async ({ conceptSetId }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      const conceptSet = await terminologyApi.getConceptSet(
        authorization,
        datasetId,
        conceptSetId
      );

      console.log(
        `[MCP-TIMING] [get_concept_set] END total=${(performance.now() - toolStart).toFixed(1)}ms`
      );

      return createStructuredResponse(
        `Retrieved concept set ID ${conceptSet.id}, name '${conceptSet.name}', ${conceptSet.concepts?.length ?? 0} concepts in expression.`,
        { conceptSet }
      );
    }
  );

  // ==================== CREATE CONCEPT SET ====================
  server.registerTool(
    "create_concept_set",
    {
      title: "Create Concept Set",
      description:
        "Create a new private concept set from a list of OMOP concepts. Use preview_concept_set_resolution first to validate the expression with the user. Returns the new concept set ID. Defaults to private (shared=false).",
      inputSchema: CreateConceptSetInput,
    },
    async ({ name, concepts }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      const userName = await getUserName(authorization);

      const newId = await terminologyApi.createConceptSet(
        authorization,
        datasetId,
        { name, concepts, shared: false, userName }
      );

      console.log(
        `[MCP-TIMING] [create_concept_set] END total=${(performance.now() - toolStart).toFixed(1)}ms id=${newId} concepts=${concepts.length}`
      );

      return createTextResponse(
        `Successfully created concept set '${name}' with ID ${newId}. ${concepts.length} concept item${concepts.length === 1 ? "" : "s"} in the expression.`
      );
    }
  );

  // ==================== UPDATE CONCEPT SET ====================
  server.registerTool(
    "update_concept_set",
    {
      title: "Update Concept Set",
      description:
        "Update an existing concept set's name, sharing, or concept expression. All fields are optional — only the provided fields are updated.",
      inputSchema: UpdateConceptSetInput,
    },
    async ({ conceptSetId, name, concepts, shared }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);
      const userName = await getUserName(authorization);

      const payload: Partial<{
        name: string;
        concepts: typeof concepts;
        shared: boolean;
        userName: string;
      }> = { userName };
      if (name !== undefined) payload.name = name;
      if (concepts !== undefined) payload.concepts = concepts;
      if (shared !== undefined) payload.shared = shared;

      const updatedId = await terminologyApi.updateConceptSet(
        authorization,
        datasetId,
        conceptSetId,
        payload
      );

      console.log(
        `[MCP-TIMING] [update_concept_set] END total=${(performance.now() - toolStart).toFixed(1)}ms id=${updatedId}`
      );

      return createTextResponse(
        `Successfully updated concept set ID ${updatedId}.`
      );
    }
  );

  // ==================== DELETE CONCEPT SET ====================
  server.registerTool(
    "delete_concept_set",
    {
      title: "Delete Concept Set",
      description:
        "Delete a concept set by ID. Irreversible. The user should confirm before calling this.",
      inputSchema: DeleteConceptSetInput,
    },
    async ({ conceptSetId }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      const deletedId = await terminologyApi.deleteConceptSet(
        authorization,
        datasetId,
        conceptSetId
      );

      console.log(
        `[MCP-TIMING] [delete_concept_set] END total=${(performance.now() - toolStart).toFixed(1)}ms id=${deletedId}`
      );

      return createTextResponse(
        `Successfully deleted concept set ID ${deletedId}.`
      );
    }
  );
}
