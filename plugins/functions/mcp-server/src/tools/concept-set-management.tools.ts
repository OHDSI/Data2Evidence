import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TerminologyAPI } from "../api/TerminologyAPI";
import {
  ListConceptSetsInput,
  GetConceptSetInput,
  CreateConceptSetInput,
  CheckConceptCoverageInput,
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
 * Register concept set tools.
 * - list_concept_sets                (paginated: first 50 + totalCount)
 * - get_concept_set                  (returns saved definition + concept list)
 * - create_concept_set               (defaults shared=false)
 * - check_concept_coverage_in_dataset (which concept IDs exist in this dataset's vocabulary)
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
        "Get one concept set by ID. Returns the SAVED definition: name, shared, and the concept expression (rule with descendants/excludes flags). Does NOT return the resolved concept-id list — only the saved expression.",
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
        "Create a new private concept set from a list of OMOP concepts. Returns the new concept set ID. Defaults to private (shared=false).",
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

  // ==================== CHECK CONCEPT COVERAGE ====================
  server.registerTool(
    "check_concept_coverage_in_dataset",
    {
      title: "Check Concept Coverage in Dataset",
      description:
        "Check which OMOP concept IDs exist in this dataset's vocabulary cache. Returns found and missing IDs. Use this before create_concept_set to inform the user which concepts have data in this dataset.",
      inputSchema: CheckConceptCoverageInput,
    },
    async ({ conceptIds }, { requestInfo }) => {
      const toolStart = performance.now();
      const { authorization, datasetId } = requireAuthAndDataset(requestInfo);

      const { found, missing } = await terminologyApi.checkConceptCoverage(
        authorization,
        datasetId,
        conceptIds
      );

      console.log(
        `[MCP-TIMING] [check_concept_coverage_in_dataset] END total=${(performance.now() - toolStart).toFixed(1)}ms found=${found.length} missing=${missing.length}`
      );

      const text = missing.length === 0
        ? `All ${found.length} concept${found.length === 1 ? "" : "s"} exist in this dataset.`
        : `${found.length} of ${conceptIds.length} concepts exist in this dataset. ${missing.length} are not in the vocabulary cache: ${missing.join(", ")}.`;

      return createStructuredResponse(text, { found, missing });
    }
  );
}
